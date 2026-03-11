import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'ai-candidates.json');
const SOURCES_FILE = path.join(__dirname, 'rss-sources.json');

const FETCH_COUNT = parseInt(process.env.FETCH_COUNT || '24', 10);
const MAX_AGE_DAYS = parseInt(process.env.MAX_AGE_DAYS || '3', 10);
const MAX_PER_SOURCE = parseInt(process.env.MAX_PER_SOURCE || '4', 10);

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'thomas-blog-ai-rss/1.0' } });

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function normalizeTitle(title = '') {
  return title.toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function clip(text = '', max = 420) {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function isoDate(input) {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function scoreItem(item) {
  const now = Date.now();
  const published = new Date(item.pubDate || item.isoDate || now).getTime();
  const ageHours = Math.max(0, (now - published) / 36e5);
  const freshness = Math.max(0, 30 - Math.min(30, ageHours * 0.8));
  const officialBoost = /(openai|google|huggingface|github\.blog|berkeley\.edu)/i.test(item.sourceDomain) ? 12 : 0;
  const titleBoost = Math.min(12, Math.ceil((item.title || '').length / 12));
  const keywordBoost = /(agent|llm|gpt|model|inference|multimodal|reasoning|open source|benchmark|release|copilot|robotics)/i.test(item.title)
    ? 8
    : 0;
  const arxivPenalty = /arxiv\.org$/i.test(item.sourceDomain) ? 6 : 0;
  return Math.round(item.priority * 7 + freshness + officialBoost + titleBoost + keywordBoost - arxivPenalty);
}

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.url);
    const limit = Math.max(1, Math.min(MAX_PER_SOURCE, source.maxItems || MAX_PER_SOURCE));
    const items = (feed.items || [])
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
    return items;
  } catch (error) {
    console.warn(`[candidates] failed: ${source.name} -> ${error.message}`);
    return [];
  }
}

async function main() {
  ensureDir(DATA_DIR);
  const sources = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400 * 1000;

  const batches = await Promise.all(sources.map(fetchSource));
  const rawItems = batches.flat();

  const deduped = [];
  const localSeenUrls = new Set();
  const localSeenTitles = new Set();
  for (const item of rawItems) {
    const published = new Date(item.pubDate).getTime();
    if (Number.isNaN(published) || published < cutoff) continue;
    const t = normalizeTitle(item.title);
    if (localSeenUrls.has(item.link)) continue;
    if (localSeenTitles.has(t)) continue;
    localSeenUrls.add(item.link);
    localSeenTitles.add(t);
    item.id = `${extractDomain(item.link)}-${crypto.createHash('sha1').update(item.link).digest('hex').slice(0, 12)}`;
    item.score = scoreItem(item);
    item.publishedAt = isoDate(item.pubDate);
    deduped.push(item);
  }

  deduped.sort((a, b) => b.score - a.score);
  const candidates = deduped.slice(0, FETCH_COUNT);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), items: candidates }, null, 2));
  console.log(`[candidates] fetched ${rawItems.length}, deduped ${deduped.length}, selected ${candidates.length}`);
  console.log(`[candidates] wrote ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('[candidates] fatal:', err);
  process.exit(1);
});
