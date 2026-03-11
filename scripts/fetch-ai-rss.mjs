import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Parser from 'rss-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'tech-news.json');
const SOURCES_FILE = path.join(__dirname, 'rss-sources.json');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'openai/gpt-4.1-mini';
const FETCH_COUNT = parseInt(process.env.FETCH_COUNT || '24', 10);
const MAX_AGE_DAYS = parseInt(process.env.MAX_AGE_DAYS || '3', 10);
const MAX_ITEMS_TO_KEEP = parseInt(process.env.MAX_ITEMS_TO_KEEP || '60', 10);
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

function clip(text = '', max = 300) {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function isoDate(input) {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const redditPenalty = /reddit\.com$/i.test(item.sourceDomain) ? 8 : 0;
  const arxivPenalty = /arxiv\.org$/i.test(item.sourceDomain) ? 6 : 0;
  return Math.round(item.priority * 7 + freshness + officialBoost + titleBoost + keywordBoost - redditPenalty - arxivPenalty);
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
    console.warn(`[rss] failed: ${source.name} -> ${error.message}`);
    return [];
  }
}

async function summarizeWithAI(candidates) {
  if (!OPENAI_API_KEY) {
    console.log('[rss] OPENAI_API_KEY/OPENROUTER_API_KEY missing, fallback to basic formatting');
    return candidates.map((item, index) => ({
      id: item.id,
      titleEn: item.title,
      titleZh: item.title,
      summaryEn: item.contentSnippet || `Update from ${item.sourceName}`,
      summaryZh: item.contentSnippet || `${item.sourceName} 更新`,
      tag: item.categoryHint || 'Tech',
      source: item.sourceDomain,
      sourceUrl: item.link,
      publishedAt: isoDate(item.pubDate),
      score: item.score,
      featured: index < 4,
    }));
  }

  const prompt = `You are curating an AI tech digest for a personal blog. Return ONLY valid JSON array.
For each item provide:
- titleEn
- titleZh
- summaryEn (1-2 concise sentences)
- summaryZh (natural Chinese)
- tag (ONE of: AI, Open Source, Infrastructure, Tools, Security, Web, Mobile, Data, Tech)
- featured (true for the strongest items only)

Items:\n${candidates.map((item, i) => `${i + 1}. [${item.sourceName}] ${item.title}\nURL: ${item.link}\nPublished: ${item.pubDate}\nHint: ${item.categoryHint}\nSnippet: ${item.contentSnippet}`).join('\n\n')}`;

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`AI API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) throw new Error('AI response missing items array');

    return candidates.map((item, index) => ({
      id: item.id,
      titleEn: items[index]?.titleEn || item.title,
      titleZh: items[index]?.titleZh || item.title,
      summaryEn: items[index]?.summaryEn || item.contentSnippet || `Update from ${item.sourceName}`,
      summaryZh: items[index]?.summaryZh || item.contentSnippet || `${item.sourceName} 更新`,
      tag: items[index]?.tag || item.categoryHint || 'Tech',
      source: item.sourceDomain,
      sourceUrl: item.link,
      publishedAt: isoDate(item.pubDate),
      score: item.score,
      featured: Boolean(items[index]?.featured),
    }));
  } catch (error) {
    console.warn(`[rss] AI summarization failed, fallback to basic formatting: ${error.message}`);
    return candidates.map((item, index) => ({
      id: item.id,
      titleEn: item.title,
      titleZh: item.title,
      summaryEn: item.contentSnippet || `Update from ${item.sourceName}`,
      summaryZh: item.contentSnippet || `${item.sourceName} 更新`,
      tag: item.categoryHint || 'Tech',
      source: item.sourceDomain,
      sourceUrl: item.link,
      publishedAt: isoDate(item.pubDate),
      score: item.score,
      featured: index < 4,
    }));
  }
}

async function main() {
  ensureDir(DATA_DIR);
  const sources = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400 * 1000;

  let existing = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
  }
  const seenUrls = new Set(existing.map(item => item.sourceUrl));
  const seenTitles = new Set(existing.map(item => normalizeTitle(item.titleEn || item.titleZh || '')));

  const batches = await Promise.all(sources.map(fetchSource));
  const rawItems = batches.flat();

  const deduped = [];
  const localSeenUrls = new Set();
  const localSeenTitles = new Set();
  for (const item of rawItems) {
    const published = new Date(item.pubDate).getTime();
    if (Number.isNaN(published) || published < cutoff) continue;
    const t = normalizeTitle(item.title);
    if (seenUrls.has(item.link) || localSeenUrls.has(item.link)) continue;
    if (seenTitles.has(t) || localSeenTitles.has(t)) continue;
    localSeenUrls.add(item.link);
    localSeenTitles.add(t);
    item.id = `${extractDomain(item.link)}-${crypto.createHash('sha1').update(item.link).digest('hex').slice(0, 12)}`;
    item.score = scoreItem(item);
    deduped.push(item);
  }

  deduped.sort((a, b) => b.score - a.score);
  const candidates = deduped.slice(0, FETCH_COUNT);
  console.log(`[rss] fetched ${rawItems.length}, deduped ${deduped.length}, selected ${candidates.length}`);

  if (candidates.length === 0) {
    console.log('[rss] no new items');
    return;
  }

  const newItems = await summarizeWithAI(candidates);
  const featuredBudget = 4;
  let featuredCount = 0;
  for (const item of newItems) {
    if (item.featured && featuredCount < featuredBudget) featuredCount += 1;
    else item.featured = false;
  }
  for (const item of newItems) {
    if (featuredCount >= featuredBudget) break;
    if (!item.featured) {
      item.featured = true;
      featuredCount += 1;
    }
  }

  const merged = [...newItems, ...existing].slice(0, MAX_ITEMS_TO_KEEP);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
  console.log(`[rss] wrote ${merged.length} items to ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('[rss] fatal:', err);
  process.exit(1);
});
