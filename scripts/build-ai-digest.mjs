import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDigestDetail,
  buildDigestItems,
  buildDigestMarkdown,
  buildDigestReport,
} from './lib/ai-digest/digest-engine.mjs';
import {
  ensureDir,
  loadJson,
  normalizeTitle,
  writeJson,
} from './lib/ai-digest/shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const POSTS_DIR = path.join(ROOT, 'posts');
const CANDIDATES_FILE = path.join(DATA_DIR, 'ai-candidates.json');
const TECH_NEWS_FILE = path.join(DATA_DIR, 'tech-news.json');
const DIGESTS_FILE = path.join(DATA_DIR, 'ai-digests.json');
const DIGEST_DETAILS_FILE = path.join(DATA_DIR, 'ai-digest-details.json');
const REPORT_FILE = path.join(DATA_DIR, 'ai-digest-report.txt');
const REPORT_JSON_FILE = path.join(DATA_DIR, 'ai-digest-report.json');
const SITE_URL = (process.env.SITE_URL || 'https://shangguangtao567-thomas.github.io/thomas-blog').replace(/\/$/, '');
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const POST_SLUG = `ai-daily-${TODAY}`;
const POST_FILENAME = `${TODAY}-${POST_SLUG}.md`;
const POST_PATH = path.join(POSTS_DIR, POST_FILENAME);
const WINDOW_HOURS = Number.parseInt(process.env.AI_DIGEST_WINDOW_HOURS || '24', 10);
const MAX_ITEMS = Number.parseInt(process.env.AI_DIGEST_MAX_ITEMS || '6', 10);
const SUFFICIENT_ITEMS = Number.parseInt(process.env.AI_DIGEST_SUFFICIENT_ITEMS || '4', 10);

function isWithinWindow(item) {
  const ts = new Date(item.pubDate || item.publishedAt || '').getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= WINDOW_HOURS * 36e5;
}

function dedupeCandidates(items) {
  const seenLinks = new Set();
  const seenTitles = new Set();
  const result = [];

  for (const item of items) {
    const link = item.link || item.sourceUrl;
    const titleKey = normalizeTitle(item.title || item.titleZh || item.titleEn || '');
    if (!link || !titleKey) continue;
    if (seenLinks.has(link) || seenTitles.has(titleKey)) continue;
    seenLinks.add(link);
    seenTitles.add(titleKey);
    result.push(item);
  }

  return result;
}

function mergeBySlug(current, next) {
  return [next, ...current.filter(item => item.slug !== next.slug)].sort((a, b) => b.date.localeCompare(a.date));
}

ensureDir(DATA_DIR);
ensureDir(POSTS_DIR);

const candidatesPayload = loadJson(CANDIDATES_FILE, { items: [] });
const freshCandidates = dedupeCandidates((candidatesPayload.items || []).filter(isWithinWindow))
  .sort((a, b) => (b.score || 0) - (a.score || 0));
const selectedCandidates = freshCandidates.slice(0, MAX_ITEMS);
const items = buildDigestItems(selectedCandidates);
const digestUrl = `${SITE_URL}/blog/${POST_SLUG}`;
const limitedUpdateWindow = items.length > 0 && items.length < SUFFICIENT_ITEMS;

const detail = buildDigestDetail({
  date: TODAY,
  items,
  windowHours: WINDOW_HOURS,
  digestUrl,
  generatedAt: new Date().toISOString(),
  limitedUpdateWindow,
});

writeJson(TECH_NEWS_FILE, items);

const digestIndex = loadJson(DIGESTS_FILE, []);
writeJson(DIGESTS_FILE, mergeBySlug(digestIndex, {
  slug: detail.slug,
  date: detail.date,
  titleZh: detail.titleZh,
  titleEn: detail.titleEn,
  excerptZh: detail.excerptZh,
  excerptEn: detail.excerptEn,
  issueSummaryZh: detail.issueSummaryZh,
  issueSummaryEn: detail.issueSummaryEn,
  path: detail.path,
  itemCount: detail.itemCount,
  heroTitleZh: detail.heroTitleZh,
  heroTitleEn: detail.heroTitleEn,
  limitedUpdateWindow: detail.limitedUpdateWindow,
  bodyCoverage: detail.bodyCoverage,
  themes: detail.themes,
  featuredItems: detail.featuredItems,
}));

const detailIndex = loadJson(DIGEST_DETAILS_FILE, []);
writeJson(DIGEST_DETAILS_FILE, mergeBySlug(detailIndex, detail));

fs.writeFileSync(POST_PATH, buildDigestMarkdown(detail));

const report = buildDigestReport(detail);
fs.writeFileSync(REPORT_FILE, report.text);
writeJson(REPORT_JSON_FILE, report.json);

console.log(`[digest] window ${WINDOW_HOURS}h -> ${freshCandidates.length} fresh candidates, selected ${items.length}`);
console.log(`[digest] wrote ${TECH_NEWS_FILE}`);
console.log(`[digest] wrote ${DIGESTS_FILE}`);
console.log(`[digest] wrote ${DIGEST_DETAILS_FILE}`);
console.log(`[digest] wrote ${POST_PATH}`);
console.log(`[digest] wrote ${REPORT_FILE}`);
console.log(`[digest] wrote ${REPORT_JSON_FILE}`);
