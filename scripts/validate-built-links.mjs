import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  baselineDir,
  readJsonFile,
  routeDistPath,
  stableJson,
} from './lib/validation-helpers.mjs';

const routeBaselinePath = join(baselineDir, 'baseline-route-manifest.json');

if (!existsSync(routeBaselinePath)) {
  throw new Error('Missing docs/baselines/baseline-route-manifest.json. Run pnpm baseline:generate first.');
}

const routeBaseline = readJsonFile(routeBaselinePath);
const htmlRoutes = routeBaseline.htmlRoutes || [];
const routeSet = new Set(htmlRoutes.map((route) => route.path));
const distDir = join(process.cwd(), 'dist');

function readDistFile(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function fileExists(relativePath) {
  return existsSync(join(process.cwd(), relativePath));
}

function isExternalReference(value = '') {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || ''));
}

function normalizePathname(pathname = '/') {
  if (!pathname) return '/';
  if (pathname === '/index.html') return '/';
  if (pathname.endsWith('/index.html')) return `${pathname.slice(0, -'index.html'.length)}`;
  return pathname;
}

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&#38;|&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function resolveReference(rawReference, fromPath) {
  const reference = decodeHtmlEntities(String(rawReference || '').trim());
  if (!reference || isExternalReference(reference) || reference.startsWith('mailto:') || reference.startsWith('tel:') || reference.startsWith('data:') || reference.startsWith('javascript:')) {
    return null;
  }

  const base = new URL(fromPath, 'https://local.test');
  try {
    const url = new URL(reference, base);
    return {
      raw: reference,
      pathname: normalizePathname(url.pathname),
      hash: url.hash ? decodeURIComponent(url.hash.slice(1)) : '',
    };
  } catch (error) {
    throw new Error(`Malformed internal reference "${reference}" from ${fromPath}`);
  }
}

function targetRelativePath(pathname) {
  return routeDistPath(pathname);
}

function extractReferences(html) {
  const refs = [];
  const attrRegex = /<(a|area|img|script|link|source)\b[^>]*\b(href|src|srcset)="([^"]+)"[^>]*>/gi;
  let match;

  while ((match = attrRegex.exec(html))) {
    const [, tag, attr, value] = match;
    if (attr === 'srcset') {
      for (const candidate of value.split(',').map((entry) => entry.trim().split(/\s+/)[0]).filter(Boolean)) {
        refs.push({ tag, attr: 'srcset', value: candidate });
      }
      continue;
    }

    refs.push({ tag, attr, value });
  }

  return refs;
}

function extractFragmentTargets(html) {
  const targets = new Set();
  const idRegex = /\bid="([^"]+)"/gi;
  const nameRegex = /\bname="([^"]+)"/gi;
  let match;

  while ((match = idRegex.exec(html))) targets.add(decodeHtmlEntities(match[1]));
  while ((match = nameRegex.exec(html))) targets.add(decodeHtmlEntities(match[1]));

  return targets;
}

const seeds = new Set([
  '/',
  '/blog/',
  '/briefing/',
  '/tech/',
  '/404.html',
  ...htmlRoutes
    .filter((route) => route.path.startsWith('/topic/') || route.path.startsWith('/blog/'))
    .map((route) => route.path),
]);

const queue = [...seeds];
const visited = new Set();
const crawled = [];
const errors = [];
const fragmentCache = new Map();

function fragmentTargetsFor(pathname) {
  if (fragmentCache.has(pathname)) return fragmentCache.get(pathname);
  const relativePath = targetRelativePath(pathname);
  if (!fileExists(relativePath)) return null;
  const targets = extractFragmentTargets(readDistFile(relativePath));
  fragmentCache.set(pathname, targets);
  return targets;
}

while (queue.length) {
  const currentPath = queue.shift();
  if (!currentPath || visited.has(currentPath)) continue;
  visited.add(currentPath);

  const relativePath = targetRelativePath(currentPath);
  if (!fileExists(relativePath)) {
    errors.push(`Missing built HTML for crawl seed ${currentPath} (${relativePath})`);
    continue;
  }

  crawled.push(currentPath);
  const html = readDistFile(relativePath);
  const references = extractReferences(html);

  for (const reference of references) {
    let resolved;

    try {
      resolved = resolveReference(reference.value, currentPath);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      continue;
    }

    if (!resolved) continue;
    if (!resolved.hash && !resolved.pathname) continue;

    if (resolved.hash && !resolved.pathname && !currentPath) {
      errors.push(`Malformed fragment reference "${reference.value}" from ${currentPath}`);
      continue;
    }

    const targetPath = resolved.pathname || currentPath;
    const targetFile = targetRelativePath(targetPath);

    if (!resolved.hash && routeSet.has(targetPath)) {
      if (!fileExists(targetFile)) {
        errors.push(`Internal route ${targetPath} from ${currentPath} is missing (${targetFile})`);
      } else if (!visited.has(targetPath)) {
        queue.push(targetPath);
      }
      continue;
    }

    if (resolved.hash) {
      if (!targetPath) {
        errors.push(`Malformed fragment reference "${reference.value}" from ${currentPath}`);
        continue;
      }
      if (!routeSet.has(targetPath) && !fileExists(targetFile)) {
        errors.push(`Fragment target page ${targetPath} from ${currentPath} does not exist`);
        continue;
      }
      if (!resolved.hash.trim()) {
        errors.push(`Empty fragment target in "${reference.value}" from ${currentPath}`);
        continue;
      }

      const targets = fragmentTargetsFor(targetPath);
      if (!targets || !targets.has(resolved.hash)) {
        errors.push(`Missing fragment target "#${resolved.hash}" on ${targetPath}, linked from ${currentPath}`);
      }

      if (routeSet.has(targetPath) && !visited.has(targetPath)) {
        queue.push(targetPath);
      }
      continue;
    }

    if (!fileExists(targetFile)) {
      errors.push(`Missing local asset or bad internal link "${reference.value}" from ${currentPath} (${targetFile})`);
      continue;
    }
  }
}

const reportPath = join(baselineDir, 'link-crawl-report.json');
writeFileSync(
  reportPath,
  `${stableJson({
    generatedAt: new Date().toISOString(),
    crawlSeedCount: seeds.size,
    crawledRoutes: crawled,
    errorCount: errors.length,
    errors,
  })}\n`,
);

if (errors.length) {
  throw new Error(`Built link validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Built link validation passed across ${crawled.length} crawled HTML routes.`);
console.log(`Wrote report: ${reportPath}`);
