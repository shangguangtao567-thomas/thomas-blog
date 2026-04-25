import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postsIndexJson from '../src/data/posts-index.json' with { type: 'json' };
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
const essayRoutes = (routeBaseline.htmlRoutes || []).filter((route) => route.kind === 'essay');
const essayPosts = postsIndexJson.filter((post) => !String(post.slug || '').startsWith('ai-daily-'));
const topicCounts = essayPosts.reduce((acc, post) => {
  const key = String(post.topicSlug || '');
  acc.set(key, (acc.get(key) || 0) + 1);
  return acc;
}, new Map());

function decodeHtmlEntities(value = '') {
  return String(value || '')
    .replace(/&#38;|&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function readText(relativePath) {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
}

function resolveHref(href, fromPath) {
  const url = new URL(decodeHtmlEntities(href), `https://local.test${fromPath}`);
  return `${url.pathname}${url.hash || ''}`;
}

const orphanEssays = [];
const duplicateEssays = [];
const thinEssays = [];
const deskFallbackMissing = [];

for (const route of essayRoutes) {
  const html = readText(routeDistPath(route.path));
  const hrefs = [];
  const regex = /<a\b[^>]*class="[^"]*\breading-path__row\b[^"]*"[^>]*href="([^"]+)"/gi;
  let match;

  while ((match = regex.exec(html))) {
    hrefs.push(resolveHref(match[1], route.path));
  }

  const uniqueHrefs = [...new Set(hrefs)];
  const selfHref = route.path;

  if (!uniqueHrefs.length || uniqueHrefs.every((href) => href === selfHref)) {
    orphanEssays.push(route.path);
  }

  if (uniqueHrefs.length !== hrefs.length) {
    duplicateEssays.push({
      path: route.path,
      hrefs,
    });
  }

  if (uniqueHrefs.length < 2) {
    thinEssays.push({
      path: route.path,
      hrefs: uniqueHrefs,
    });
  }

  const post = essayPosts.find((entry) => `/blog/${entry.slug}/` === route.path);
  const topicCount = topicCounts.get(String(post?.topicSlug || '')) || 0;
  const hasDeskLevelContinuation = uniqueHrefs.some((href) => href.startsWith('/blog/') && href !== selfHref);

  if (topicCount <= 1 && !hasDeskLevelContinuation) {
    deskFallbackMissing.push(route.path);
  }
}

const reportPath = join(baselineDir, 'reading-path-report.json');
writeFileSync(
  reportPath,
  `${stableJson({
    generatedAt: new Date().toISOString(),
    essayCount: essayRoutes.length,
    orphanEssays,
    duplicateEssays,
    thinEssays,
    deskFallbackMissing,
  })}\n`,
);

const errors = [
  ...orphanEssays.map((path) => `Essay continuation path is missing or self-referential: ${path}`),
  ...duplicateEssays.map((entry) => `Essay continuation path contains duplicates: ${entry.path}`),
  ...deskFallbackMissing.map((path) => `Singleton-topic essay is missing desk-level continuation: ${path}`),
];

if (errors.length) {
  throw new Error(`Reading-path validation failed:\n- ${errors.join('\n- ')}`);
}

console.log(`Reading-path validation passed for ${essayRoutes.length} essay pages.`);
console.log(`Thin paths flagged: ${thinEssays.length}`);
console.log(`Wrote report: ${reportPath}`);
