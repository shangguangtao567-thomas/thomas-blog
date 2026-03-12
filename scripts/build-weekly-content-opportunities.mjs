import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const DIGEST_DETAILS_FILE = path.join(DATA_DIR, 'ai-digest-details.json');
const POSTS_INDEX_FILE = path.join(DATA_DIR, 'posts-index.json');
const OUTPUT_FILE = path.join(DATA_DIR, 'weekly-content-opportunities.json');
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const digests = loadJson(DIGEST_DETAILS_FILE, []);
const posts = loadJson(POSTS_INDEX_FILE, []);
const now = Date.now();
const recentDigests = digests.filter(item => {
  const ts = new Date(item.generatedAt || item.date || '').getTime();
  return Number.isFinite(ts) && now - ts <= WINDOW_MS;
});

if (!recentDigests.length) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 2));
  console.log('[weekly-content] no recent digests, wrote empty file');
  process.exit(0);
}

const alreadyCovered = new Set(
  posts
    .filter(post => !post.slug.startsWith('ai-daily-'))
    .flatMap(post => [post.pillar, post.tagEn, post.tag].filter(Boolean).map(item => String(item).toLowerCase()))
);

const themeMap = new Map();
for (const digest of recentDigests) {
  for (const theme of digest.themes || []) {
    const key = `${theme.themeZh}__${theme.themeEn}`;
    const existing = themeMap.get(key) || {
      id: slugify(theme.themeEn || theme.themeZh) || `opportunity-${themeMap.size + 1}`,
      themeZh: theme.themeZh,
      themeEn: theme.themeEn,
      score: 0,
      relatedDigestSlugs: [],
      heroTitlesZh: [],
    };
    existing.score += Number(theme.count || 1);
    existing.relatedDigestSlugs = [digest.slug, ...existing.relatedDigestSlugs.filter(item => item !== digest.slug)];
    if (digest.heroTitleZh) existing.heroTitlesZh = [digest.heroTitleZh, ...existing.heroTitlesZh];
    themeMap.set(key, existing);
  }
}

const opportunities = Array.from(themeMap.values())
  .filter(item => !alreadyCovered.has(item.themeEn.toLowerCase()) || item.score >= 3)
  .sort((a, b) => b.score - a.score)
  .slice(0, 3)
  .map((item, index) => ({
    id: item.id || `opportunity-${index + 1}`,
    themeZh: item.themeZh,
    themeEn: item.themeEn,
    score: item.score,
    rationaleZh: `过去 7 天里，${item.themeZh} 在日报里反复出现，而且还没有被系统化写成专题长文。`,
    rationaleEn: `${item.themeEn} kept recurring across the last 7 days of digests and still deserves a more durable long-form treatment.`,
    proposedTitleZh: `${item.themeZh} 为什么正在变成这一周最值得写的 AI 主线`,
    proposedTitleEn: `Why ${item.themeEn} is becoming the AI theme worth writing this week`,
    relatedDigestSlugs: item.relatedDigestSlugs.slice(0, 3),
  }));

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(opportunities, null, 2));
console.log(`[weekly-content] wrote ${OUTPUT_FILE}`);
