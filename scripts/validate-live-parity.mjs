import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  baselineDir,
  loadSiteConfig,
  readJsonFile,
  writeJsonFile,
} from './lib/validation-helpers.mjs';

const fixtureMatrixPath = join(baselineDir, 'baseline-fixture-matrix.json');
const routeBaselinePath = join(baselineDir, 'baseline-route-manifest.json');
const reportPath = join(baselineDir, 'live-parity-report.json');
const retryAttempts = 3;
const retryDelayMs = 5000;

if (!existsSync(fixtureMatrixPath) || !existsSync(routeBaselinePath)) {
  throw new Error('Missing docs/baselines route fixtures. Run pnpm baseline:generate first.');
}

const siteConfig = loadSiteConfig();
const siteUrl = String(siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
const fixtureMatrix = readJsonFile(fixtureMatrixPath);
const routeBaseline = readJsonFile(routeBaselinePath);
const routeByPath = new Map((routeBaseline.htmlRoutes || []).map((route) => [route.path, route]));
const lighthouseFixtures = fixtureMatrix?.lighthouse?.fixtures || [];
const fixtureById = new Map(lighthouseFixtures.map((fixture) => [fixture.id, fixture]));

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function absoluteUrl(path = '/') {
  return `${siteUrl}${String(path || '/').startsWith('/') ? path : `/${path}`}`;
}

function extractTitle(html = '') {
  const match = String(html).match(/<title>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

function extractCanonical(html = '') {
  const match = String(html).match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  return match ? match[1].trim() : '';
}

function extractMeta(html = '', attr, key) {
  const pattern = new RegExp(`<meta\\b[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i');
  const forward = String(html).match(pattern);
  if (forward) return forward[1].trim();

  const reversePattern = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["'][^>]*>`, 'i');
  const reverse = String(html).match(reversePattern);
  return reverse ? reverse[1].trim() : '';
}

function hasFragment(html = '', fragment) {
  return String(html).includes(fragment);
}

function normalizeContentType(value = '') {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function buildTargets() {
  const home = fixtureById.get('home');
  const briefing = fixtureById.get('briefing-index');
  const essay = fixtureById.get('essay-lead');
  const digest = fixtureById.get('digest-lead');
  const topic = fixtureById.get('topic-lead');

  const targets = [
    { id: 'home', path: home?.path || '/', expectedStatus: 200 },
    { id: 'briefing-index', path: briefing?.path || '/briefing/', expectedStatus: 200 },
    { id: 'tech-compat', path: '/tech/', expectedStatus: 200 },
    { id: 'not-found', path: '/404.html', expectedStatus: 404 },
    essay ? { id: 'essay-lead', path: essay.path, expectedStatus: 200 } : undefined,
    digest ? { id: 'digest-lead', path: digest.path, expectedStatus: 200 } : undefined,
    topic ? { id: 'topic-lead', path: topic.path, expectedStatus: 200 } : undefined,
  ].filter(Boolean);

  if (targets.length < 7) {
    throw new Error('Live parity target set is incomplete. Check docs/baselines/baseline-fixture-matrix.json.');
  }

  return targets;
}

async function fetchText(path) {
  const response = await fetch(absoluteUrl(path), {
    headers: {
      'user-agent': 'thomas-blog-live-parity/1.0',
      accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'manual',
  });

  const body = await response.text();
  return {
    status: response.status,
    location: response.headers.get('location') || '',
    contentType: normalizeContentType(response.headers.get('content-type') || ''),
    body,
  };
}

async function fetchAsset(path) {
  const response = await fetch(absoluteUrl(path), {
    headers: {
      'user-agent': 'thomas-blog-live-parity/1.0',
      accept: '*/*',
    },
    redirect: 'manual',
  });

  return {
    status: response.status,
    location: response.headers.get('location') || '',
    contentType: normalizeContentType(response.headers.get('content-type') || ''),
    body: await response.text(),
  };
}

function validateCommonRoute(target, result) {
  const route = routeByPath.get(target.path);
  const errors = [];
  const canonical = extractCanonical(result.body);
  const robots = extractMeta(result.body, 'name', 'robots');
  const ogType = extractMeta(result.body, 'property', 'og:type');
  const title = extractTitle(result.body);

  if (!route) {
    errors.push(`No route baseline found for ${target.path}`);
    return { errors, summary: { title, canonical, robots, ogType } };
  }

  if (result.status !== target.expectedStatus) {
    errors.push(`Expected HTTP ${target.expectedStatus}, got ${result.status}`);
  }

  if (result.location) {
    errors.push(`Unexpected redirect to ${result.location}`);
  }

  if (result.contentType !== 'text/html') {
    errors.push(`Expected text/html, got ${result.contentType || 'unknown'}`);
  }

  if (title !== route.title) {
    errors.push(`Title mismatch: expected "${route.title}", got "${title || '(missing)'}"`);
  }

  if (canonical !== route.canonical) {
    errors.push(`Canonical mismatch: expected ${route.canonical}, got ${canonical || '(missing)'}`);
  }

  if (robots !== route.robots) {
    errors.push(`Robots mismatch: expected ${route.robots}, got ${robots || '(missing)'}`);
  }

  if (ogType !== route.ogType) {
    errors.push(`og:type mismatch: expected ${route.ogType}, got ${ogType || '(missing)'}`);
  }

  if (!hasFragment(result.body, 'id="main-content"')) {
    errors.push('Missing stable main content target `#main-content`');
  }

  return {
    errors,
    summary: {
      title,
      canonical,
      robots,
      ogType,
      status: result.status,
    },
  };
}

function validateRouteSpecifics(target, result) {
  const errors = [];
  const refresh = extractMeta(result.body, 'http-equiv', 'refresh');

  if (target.id === 'home') {
    if (!hasFragment(result.body, 'class="skip-link"') || !hasFragment(result.body, 'href="#main-content"')) {
      errors.push('Homepage is missing the visible-on-focus skip link');
    }
  }

  if (target.id === 'briefing-index') {
    if (!hasFragment(result.body, 'Open latest issue')) {
      errors.push('Briefing index is missing the live archive handoff CTA');
    }
  }

  if (target.id === 'tech-compat') {
    if (!refresh.includes('/briefing/')) {
      errors.push('Compatibility route is missing the /briefing/ refresh handoff');
    }
    if (!hasFragment(result.body, 'compat-shell')) {
      errors.push('Compatibility route is missing the compat shell markup');
    }
    if (!hasFragment(result.body, 'Open briefing')) {
      errors.push('Compatibility route is missing the briefing handoff link');
    }
  }

  if (target.id === 'not-found') {
    if (refresh) {
      errors.push('404 page should not contain a refresh handoff');
    }
    if (!hasFragment(result.body, 'compat-shell')) {
      errors.push('404 page is missing the shared fallback shell');
    }
    if (!hasFragment(result.body, 'href="/briefing/"')) {
      errors.push('404 page is missing the briefing recovery link');
    }
  }

  if (target.id === 'essay-lead') {
    if (!hasFragment(result.body, 'article-header__title')) {
      errors.push('Essay detail is missing the article header');
    }
    if (!hasFragment(result.body, 'reading-path__list')) {
      errors.push('Essay detail is missing the continuation reading path');
    }
  }

  if (target.id === 'digest-lead') {
    if (!hasFragment(result.body, 'article-header__title')) {
      errors.push('Digest detail is missing the article header');
    }
    if (!hasFragment(result.body, 'Adjacent issues')) {
      errors.push('Digest detail is missing the adjacent issues rail');
    }
  }

  if (target.id === 'topic-lead') {
    if (!hasFragment(result.body, 'reading-path__list')) {
      errors.push('Topic page is missing the start-here reading path');
    }
    if (!hasFragment(result.body, 'story-list')) {
      errors.push('Topic page is missing the archive story list');
    }
  }

  return {
    refresh,
    errors,
  };
}

async function validateTarget(target) {
  let lastResult = null;
  let lastErrors = [];

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const result = await fetchText(target.path);
      const common = validateCommonRoute(target, result);
      const specific = validateRouteSpecifics(target, result);
      const errors = [...common.errors, ...specific.errors];

      lastResult = {
        id: target.id,
        path: target.path,
        attempt,
        ...common.summary,
        refresh: specific.refresh || '',
      };
      lastErrors = errors;

      if (!errors.length) {
        return {
          result: lastResult,
          errors: [],
        };
      }
    } catch (error) {
      lastResult = {
        id: target.id,
        path: target.path,
        attempt,
        status: 0,
        title: '',
        canonical: '',
        robots: '',
        ogType: '',
        refresh: '',
      };
      lastErrors = [`Fetch failed: ${error instanceof Error ? error.message : String(error)}`];
    }

    if (attempt < retryAttempts) {
      await sleep(retryDelayMs);
    }
  }

  return {
    result: lastResult,
    errors: lastErrors,
  };
}

async function validateAssetFromHome(homeHtml) {
  const match = String(homeHtml).match(/(?:href|src)=["'](\/_astro\/[^"']+\.(?:css|js))["']/i);
  if (!match) {
    return {
      assetPath: '',
      status: 0,
      contentType: '',
      errors: ['Could not find a representative /_astro asset on the live homepage'],
    };
  }

  const assetPath = match[1];
  let lastError = null;

  for (let attempt = 1; attempt <= retryAttempts; attempt += 1) {
    try {
      const response = await fetchAsset(assetPath);
      const errors = [];

      if (response.location) {
        errors.push(`Expected live asset ${assetPath} to load directly, got redirect to ${response.location}`);
      }

      if (response.status !== 200) {
        errors.push(`Expected live asset ${assetPath} to return 200, got ${response.status}`);
      }

      if (!['text/css', 'text/javascript', 'application/javascript'].includes(response.contentType)) {
        errors.push(`Expected /_astro asset ${assetPath} to be CSS or JS, got ${response.contentType || 'unknown'}`);
      }

      if (response.body.length < 32) {
        errors.push(`Live asset ${assetPath} is unexpectedly small (${response.body.length} bytes)`);
      }

      if (!errors.length) {
        return {
          assetPath,
          attempt,
          status: response.status,
          contentType: response.contentType,
          size: response.body.length,
          errors: [],
        };
      }

      lastError = {
        assetPath,
        attempt,
        status: response.status,
        contentType: response.contentType,
        size: response.body.length,
        errors,
      };
    } catch (error) {
      lastError = {
        assetPath,
        attempt,
        status: 0,
        contentType: '',
        size: 0,
        errors: [`Asset fetch failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }

    if (attempt < retryAttempts) {
      await sleep(retryDelayMs);
    }
  }

  return lastError || {
    assetPath,
    status: 0,
    contentType: '',
    size: 0,
    errors: ['Unknown asset validation failure'],
  };
}

const targets = buildTargets();
const routeResults = [];
const errors = [];

for (const target of targets) {
  const outcome = await validateTarget(target);
  routeResults.push(outcome.result);
  errors.push(...outcome.errors.map((error) => `${target.path}: ${error}`));
}

const homeResult = routeResults.find((route) => route.id === 'home');
const homeHtml = homeResult ? (await fetchText(homeResult.path)).body : '';
const assetResult = await validateAssetFromHome(homeHtml);
errors.push(...assetResult.errors);

writeJsonFile(reportPath, {
  generatedAt: new Date().toISOString(),
  siteUrl,
  routeCount: routeResults.length,
  routes: routeResults,
  asset: assetResult,
  errorCount: errors.length,
  errors,
});

if (errors.length) {
  throw new Error(`Live site parity failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Live site parity passed for ${routeResults.length} routes plus 1 /_astro asset on ${siteUrl}.`);
console.log(`Wrote report: ${reportPath}`);
