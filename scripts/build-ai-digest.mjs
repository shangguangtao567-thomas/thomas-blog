import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildDigestDetailAsync,
  buildDigestItemsAsync,
  buildDigestMarkdown,
  buildDigestReport,
} from './lib/ai-digest/digest-engine.mjs';
import {
  cleanText,
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
const SITE_URL = (process.env.SITE_URL || 'https://blog.lincept.com').replace(/\/$/, '');
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

// Title deduplication: check if today's title is too similar to recent digests
function titleSimilarityScore(title1, title2) {
  const normalize = (t) => cleanText(t).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
  const n1 = normalize(title1);
  const n2 = normalize(title2);

  if (n1 === n2) return 1;
  if (n1.includes(n2) || n2.includes(n1)) return 0.8;

  // Check word overlap
  const words1 = new Set(n1.split(''));
  const words2 = new Set(n2.split(''));
  const overlap = [...words1].filter(w => words2.has(w)).length;
  const maxLen = Math.max(words1.size, words2.size);
  return maxLen > 0 ? overlap / maxLen : 0;
}

function getRecentDigestTitles(limit = 3) {
  const digestIndex = loadJson(DIGESTS_FILE, []);
  return digestIndex.slice(0, limit).map(d => ({
    date: d.date,
    titleZh: d.titleZh || '',
    titleEn: d.titleEn || '',
  }));
}

function needsTitleRegeneration(newTitleZh, newTitleEn) {
  const recent = getRecentDigestTitles(3);
  const SIMILARITY_THRESHOLD = 0.6;

  for (const prev of recent) {
    const scoreZh = titleSimilarityScore(newTitleZh, prev.titleZh);
    const scoreEn = titleSimilarityScore(newTitleEn, prev.titleEn);

    if (scoreZh > SIMILARITY_THRESHOLD || scoreEn > SIMILARITY_THRESHOLD) {
      return {
        needsRegen: true,
        similarTo: prev.date,
        similarity: Math.max(scoreZh, scoreEn),
      };
    }
  }

  return { needsRegen: false };
}

function generateDistinguishedTitle(detail, items) {
  const date = new Date(detail.date);
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
  const keyTopics = items.slice(0, 3).map(item => item.themeEn || item.tag || 'AI').join(', ');

  return {
    titleZh: `AI 日报 (${dayOfWeek})｜${keyTopics.split(',').slice(0, 2).join(' + ')}`,
    titleEn: `AI Daily (${dayOfWeek}) | ${keyTopics}`,
  };
}

async function main() {
  ensureDir(DATA_DIR);
  ensureDir(POSTS_DIR);

  const candidatesPayload = loadJson(CANDIDATES_FILE, { items: [] });
  const freshCandidates = dedupeCandidates((candidatesPayload.items || []).filter(isWithinWindow))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const selectedCandidates = freshCandidates.slice(0, MAX_ITEMS);

  // Use LLM-driven narrative generation (with fallback to templates)
  const items = await buildDigestItemsAsync(selectedCandidates);
  const digestUrl = `${SITE_URL}/blog/${POST_SLUG}`;
  const limitedUpdateWindow = items.length > 0 && items.length < SUFFICIENT_ITEMS;

  const detail = await buildDigestDetailAsync({
    date: TODAY,
    items,
    windowHours: WINDOW_HOURS,
    digestUrl,
    generatedAt: new Date().toISOString(),
    limitedUpdateWindow,
  });

  // Check for title duplication with recent digests
  const titleCheck = needsTitleRegeneration(detail.titleZh, detail.titleEn);
  let finalDetail = detail;

  if (titleCheck.needsRegen) {
    console.log(`[digest] title too similar to ${titleCheck.similarTo} (similarity: ${titleCheck.similarity.toFixed(2)}), regenerating...`);
    const newTitles = generateDistinguishedTitle(detail, items);

    finalDetail = {
      ...detail,
      titleZh: `AI 日报｜${newTitles.titleZh.split('｜')[1] || newTitles.titleZh}`,
      titleEn: `AI Daily | ${newTitles.titleEn.split('|')[1] || newTitles.titleEn}`,
      titleRegenerated: true,
      titleRegenReason: `Similar to digest from ${titleCheck.similarTo}`,
    };
  }

  writeJson(TECH_NEWS_FILE, items);

  const digestIndex = loadJson(DIGESTS_FILE, []);
  writeJson(DIGESTS_FILE, mergeBySlug(digestIndex, {
    slug: finalDetail.slug,
    date: finalDetail.date,
    titleZh: finalDetail.titleZh,
    titleEn: finalDetail.titleEn,
    excerptZh: finalDetail.excerptZh,
    excerptEn: finalDetail.excerptEn,
    issueSummaryZh: finalDetail.issueSummaryZh,
    issueSummaryEn: finalDetail.issueSummaryEn,
    path: finalDetail.path,
    itemCount: finalDetail.itemCount,
    heroTitleZh: finalDetail.heroTitleZh,
    heroTitleEn: finalDetail.heroTitleEn,
    limitedUpdateWindow: finalDetail.limitedUpdateWindow,
    bodyCoverage: finalDetail.bodyCoverage,
    themes: finalDetail.themes,
    featuredItems: finalDetail.featuredItems,
    llmGenerated: finalDetail.llmGenerated,
    titleRegenerated: finalDetail.titleRegenerated || false,
  }));

  const detailIndex = loadJson(DIGEST_DETAILS_FILE, []);
  writeJson(DIGEST_DETAILS_FILE, mergeBySlug(detailIndex, finalDetail));

  fs.writeFileSync(POST_PATH, buildDigestMarkdown(finalDetail));

  const report = buildDigestReport(finalDetail);
  fs.writeFileSync(REPORT_FILE, report.text);
  writeJson(REPORT_JSON_FILE, report.json);

  console.log(`[digest] window ${WINDOW_HOURS}h -> ${freshCandidates.length} fresh candidates, selected ${items.length}`);
  console.log(`[digest] LLM generated: ${finalDetail.llmGenerated ? 'yes' : 'no (fallback to templates)'}`);
  if (finalDetail.titleRegenerated) {
    console.log(`[digest] title regenerated: ${finalDetail.titleRegenReason}`);
  }
  console.log(`[digest] wrote ${TECH_NEWS_FILE}`);
  console.log(`[digest] wrote ${DIGESTS_FILE}`);
  console.log(`[digest] wrote ${DIGEST_DETAILS_FILE}`);
  console.log(`[digest] wrote ${POST_PATH}`);
  console.log(`[digest] wrote ${REPORT_FILE}`);
  console.log(`[digest] wrote ${REPORT_JSON_FILE}`);
}

main().catch(err => {
  console.error('[digest] fatal:', err);
  process.exit(1);
});
