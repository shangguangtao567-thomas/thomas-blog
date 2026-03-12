import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Parser from 'rss-parser';
import { enrichCandidatesWithBodies } from './lib/ai-digest/body-fetcher.mjs';
import {
  cleanText,
  ensureDir,
  loadJson,
  normalizeTitle,
  toIsoDate,
  writeJson,
} from './lib/ai-digest/shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'ai-candidates.json');
const SOURCES_FILE = path.join(__dirname, 'rss-sources.json');

const FETCH_COUNT = Number.parseInt(process.env.FETCH_COUNT || '24', 10);
const MAX_AGE_DAYS = Number.parseInt(process.env.MAX_AGE_DAYS || '3', 10);
const MAX_PER_SOURCE = Number.parseInt(process.env.MAX_PER_SOURCE || '4', 10);

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'thomas-blog-ai-rss/2.0' } });

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function clip(text = '', max = 420) {
  const normalized = cleanText(text);
  return normalized.length > max ? `${normalized.slice(0, max)}…` : normalized;
}

function scoreItem(item) {
  const now = Date.now();
  const published = new Date(item.pubDate || item.isoDate || now).getTime();
  const ageHours = Math.max(0, (now - published) / 36e5);
  const freshness = Math.max(0, 30 - Math.min(30, ageHours * 0.8));
  const officialBoost = /(openai|google|huggingface|github\.blog|berkeley\.edu|microsoft\.com)/i.test(item.sourceDomain) ? 12 : 0;
  const titleBoost = Math.min(12, Math.ceil((item.title || '').length / 12));
  const keywordBoost = /(agent|llm|gpt|model|inference|multimodal|reasoning|open source|benchmark|release|copilot|robotics|workflow|embedding)/i.test(item.title)
    ? 8
    : 0;
  const arxivPenalty = /arxiv\.org$/i.test(item.sourceDomain) ? 6 : 0;
  return Math.round(item.priority * 7 + freshness + officialBoost + titleBoost + keywordBoost - arxivPenalty);
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const limit = Math.max(1, Math.min(MAX_PER_SOURCE, source.maxItems || MAX_PER_SOURCE));
    return (feed.items || [])
      .filter(item => item.link && item.title)
      .slice(0, limit)
      .map(item => ({
        sourceName: source.name,
        sourceUrl: source.url,
        categoryHint: source.category,
        priority: source.priority,
        reason: source.reason,
        title: item.title,
        link: item.link,
        contentSnippet: clip(item.contentSnippet || item.content || item.summary || ''),
        pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
        sourceDomain: extractDomain(item.link),
      }));
  } catch (error) {
    console.warn(`[candidates] failed: ${source.name} -> ${error.message}`);
    return [];
  }
}

async function main() {
  ensureDir(DATA_DIR);

  const sources = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
  const existingPayload = loadJson(OUTPUT_FILE, { generatedAt: '', items: [] });
  const existingByUrl = new Map((existingPayload.items || []).map(item => [item.link, item]));
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400 * 1000;

  if (process.env.AI_DIGEST_OFFLINE === '1') {
    console.log('[candidates] offline mode enabled; keeping cached ai-candidates.json');
    return;
  }

  const batches = await Promise.all(sources.map(fetchSource));
  const rawItems = batches.flat();

  const deduped = [];
  const localSeenUrls = new Set();
  const localSeenTitles = new Set();

  for (const item of rawItems) {
    const published = new Date(item.pubDate).getTime();
    if (Number.isNaN(published) || published < cutoff) continue;

    const normalizedTitle = normalizeTitle(item.title);
    if (localSeenUrls.has(item.link) || localSeenTitles.has(normalizedTitle)) continue;

    localSeenUrls.add(item.link);
    localSeenTitles.add(normalizedTitle);

    const previous = existingByUrl.get(item.link) || {};
    deduped.push({
      ...previous,
      ...item,
      id: previous.id || `${extractDomain(item.link)}-${crypto.createHash('sha1').update(item.link).digest('hex').slice(0, 12)}`,
      score: scoreItem(item),
      publishedAt: toIsoDate(item.pubDate),
    });
  }

  deduped.sort((a, b) => (b.score || 0) - (a.score || 0));
  const selected = deduped.slice(0, FETCH_COUNT);

  if (selected.length === 0) {
    if ((existingPayload.items || []).length > 0) {
      console.warn('[candidates] no fresh items fetched; keeping existing ai-candidates.json');
      return;
    }
    writeJson(OUTPUT_FILE, { generatedAt: new Date().toISOString(), items: [] });
    console.log('[candidates] wrote empty candidate file');
    return;
  }

  const enriched = await enrichCandidatesWithBodies(selected);
  const payload = {
    generatedAt: new Date().toISOString(),
    windowDays: MAX_AGE_DAYS,
    selectedCount: enriched.items.length,
    bodyFetch: enriched.bodyFetch,
    items: enriched.items,
  };

  writeJson(OUTPUT_FILE, payload);
  console.log(`[candidates] fetched ${rawItems.length}, deduped ${deduped.length}, selected ${selected.length}`);
  console.log(`[candidates] body fetch targeted ${payload.bodyFetch.targeted}, succeeded ${payload.bodyFetch.succeeded}`);
  console.log(`[candidates] wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('[candidates] fatal:', err);
  process.exit(1);
});
