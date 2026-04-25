import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { baselineDir, loadSiteConfig, readJsonFile } from './lib/validation-helpers.mjs';

const distDir = join(process.cwd(), 'dist');
const routeBaselinePath = join(baselineDir, 'baseline-route-manifest.json');
const fixtureMatrixPath = join(baselineDir, 'baseline-fixture-matrix.json');

if (!existsSync(routeBaselinePath)) {
  throw new Error('Missing docs/baselines/baseline-route-manifest.json. Run pnpm baseline:generate first.');
}

if (!existsSync(fixtureMatrixPath)) {
  throw new Error('Missing docs/baselines/baseline-fixture-matrix.json. Run pnpm baseline:generate first.');
}

const routeBaseline = readJsonFile(routeBaselinePath);
const fixtureMatrix = readJsonFile(fixtureMatrixPath);
const siteConfig = loadSiteConfig();

function fileExists(relativePath) {
  return existsSync(join(process.cwd(), relativePath));
}

function readText(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
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

function extractFirst(html, regex) {
  const match = html.match(regex);
  return match ? match[1] : '';
}

function getMetaContent(html, attrName, attrValue) {
  const pattern = new RegExp(
    `<meta\\b[^>]*\\b${attrName}="${attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*\\bcontent="([^"]*)"[^>]*>`,
    'i',
  );
  return decodeHtmlEntities(extractFirst(html, pattern));
}

function getLinkHref(html, relValue) {
  const pattern = new RegExp(
    `<link\\b[^>]*\\brel="${relValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*\\bhref="([^"]*)"[^>]*>`,
    'i',
  );
  return decodeHtmlEntities(extractFirst(html, pattern));
}

function getTitle(html) {
  return decodeHtmlEntities(extractFirst(html, /<title>([\s\S]*?)<\/title>/i));
}

function hasJsonLd(html) {
  return /<script\b[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/i.test(html);
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

const errors = [];
const htmlRoutes = routeBaseline.htmlRoutes || [];
const assets = routeBaseline.assets || [];
const kindMatrix = fixtureMatrix.htmlKinds || {};

for (const route of htmlRoutes) {
  const htmlPath = route.distPath;
  assert(fileExists(htmlPath), `[${route.kind}] missing HTML file: ${htmlPath}`, errors);
  if (!fileExists(htmlPath)) continue;

  const html = readText(htmlPath);
  const kindChecks = kindMatrix[route.kind] || {};

  assert(getTitle(html) === route.title, `[${route.kind}] title mismatch`, errors);
  assert(getLinkHref(html, 'canonical') === route.canonical, `[${route.kind}] canonical mismatch`, errors);
  assert(getMetaContent(html, 'name', 'robots') === route.robots, `[${route.kind}] robots mismatch`, errors);
  assert(getMetaContent(html, 'property', 'og:type') === route.ogType, `[${route.kind}] og:type mismatch`, errors);
  assert(getMetaContent(html, 'property', 'og:title') === route.title, `[${route.kind}] og:title mismatch`, errors);
  assert(getMetaContent(html, 'property', 'og:description') === route.description, `[${route.kind}] og:description mismatch`, errors);
  assert(getMetaContent(html, 'property', 'og:url') === route.canonical, `[${route.kind}] og:url mismatch`, errors);

  if (kindChecks.jsonLd) {
    assert(hasJsonLd(html), `[${route.kind}] expected JSON-LD script`, errors);
  } else {
    assert(!hasJsonLd(html), `[${route.kind}] unexpected JSON-LD script`, errors);
  }

  if (route.noindex) {
    assert(getMetaContent(html, 'name', 'robots') === 'noindex,follow', `[${route.kind}] noindex robots mismatch`, errors);
  }

  if (route.refreshTo) {
    const refresh = extractFirst(html, /<meta\b[^>]*http-equiv="refresh"[^>]*content="([^"]*)"[^>]*>/i);
    assert(refresh.includes(route.refreshTo), `[${route.kind}] refresh target mismatch`, errors);
  }
}

for (const asset of assets) {
  assert(fileExists(asset.distPath), `[${asset.kind}] missing asset: ${asset.distPath}`, errors);
}

assert(fileExists('dist/robots.txt'), '[assets] missing dist/robots.txt', errors);
assert(fileExists('dist/CNAME'), '[assets] missing dist/CNAME', errors);
assert(fileExists('dist/feed.xml'), '[assets] missing dist/feed.xml', errors);
assert(fileExists('dist/sitemap.xml'), '[assets] missing dist/sitemap.xml', errors);

if (!siteConfig.plausibleDomain) {
  for (const route of htmlRoutes) {
    if (!fileExists(route.distPath)) continue;
    const html = readText(route.distPath);
    assert(!/plausible/i.test(html), `[${route.kind}] unexpected Plausible script`, errors);
  }
}

if (errors.length) {
  throw new Error(`Static output validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Static output validated for ${htmlRoutes.length} HTML routes and ${assets.length} assets.`);
