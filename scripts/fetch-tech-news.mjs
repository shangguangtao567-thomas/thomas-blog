/**
 * fetch-tech-news.mjs
 * 
 * Fetches top stories from Hacker News, processes them with OpenAI to:
 * - Generate bilingual titles (EN/ZH)
 * - Generate bilingual summaries (EN/ZH)
 * - Categorize into tech tags
 * - Mark top items as featured
 * 
 * Output: src/data/tech-news.json
 * 
 * Usage:
 *   OPENAI_API_KEY=sk-xxx node scripts/fetch-tech-news.mjs
 * 
 * Environment variables:
 *   OPENAI_API_KEY  - Required
 *   FETCH_COUNT     - Number of stories to fetch (default: 20)
 *   MAX_AGE_DAYS    - Max age of stories in days (default: 3)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'tech-news.json');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FETCH_COUNT = parseInt(process.env.FETCH_COUNT || '20');
const MAX_AGE_DAYS = parseInt(process.env.MAX_AGE_DAYS || '3');
const MAX_ITEMS_TO_KEEP = 60; // Max items to keep in the JSON file

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Hacker News API ───────────────────────────────────────────────────────

async function fetchHNTopStories(count) {
  console.log(`📡 Fetching top ${count} HN stories...`);
  const topIds = await fetchJSON('https://hacker-news.firebaseio.com/v0/topstories.json');
  
  const cutoff = Date.now() / 1000 - MAX_AGE_DAYS * 86400;
  const stories = [];
  
  for (const id of topIds.slice(0, count * 3)) {
    if (stories.length >= count) break;
    try {
      const item = await fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      if (!item || !item.url || !item.title) continue;
      if (item.time < cutoff) continue;
      if (item.score < 10) continue;
      
      stories.push({
        id: item.id,
        title: item.title,
        url: item.url,
        score: item.score,
        time: item.time,
        source: extractDomain(item.url),
      });
    } catch (err) {
      // Skip failed items
    }
    await sleep(50); // Be nice to the API
  }
  
  console.log(`✓ Fetched ${stories.length} stories from HN`);
  return stories;
}

function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

// ─── OpenAI Processing ─────────────────────────────────────────────────────

async function processStoriesWithAI(stories) {
  console.log(`🤖 Processing ${stories.length} stories with OpenAI...`);
  
  const storiesText = stories.map((s, i) => 
    `${i + 1}. Title: "${s.title}"\n   URL: ${s.url}\n   Score: ${s.score}`
  ).join('\n\n');
  
  const prompt = `You are a tech news curator. Process these Hacker News stories and return a JSON array.

For each story, provide:
- titleEn: Clean, engaging English title (can slightly rewrite for clarity)
- titleZh: Natural Chinese translation of the title
- summaryEn: 1-2 sentence English summary explaining why this matters (infer from title/URL)
- summaryZh: Natural Chinese translation of the summary
- tag: ONE category from: ["AI", "Open Source", "Infrastructure", "Tools", "Security", "Web", "Mobile", "Data", "Tech"]
- featured: true for the top 4 most interesting/impactful stories, false for others

Stories to process:
${storiesText}

Return ONLY a valid JSON array with exactly ${stories.length} objects. No markdown, no explanation.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(60000),
  });
  
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${err}`);
  }
  
  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  // Parse JSON (handle potential markdown code blocks)
  const jsonStr = content.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  const processed = JSON.parse(jsonStr);
  
  console.log(`✓ AI processed ${processed.length} stories`);
  return processed;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Starting tech news fetch...\n');
  
  // Ensure data directory exists
  fs.mkdirSync(DATA_DIR, { recursive: true });
  
  // Load existing news (to avoid duplicates)
  let existingNews = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    existingNews = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`📚 Loaded ${existingNews.length} existing items`);
  }
  const existingUrls = new Set(existingNews.map(n => n.sourceUrl));
  
  // Fetch HN stories
  const stories = await fetchHNTopStories(FETCH_COUNT);
  
  // Filter out already-seen stories
  const newStories = stories.filter(s => !existingUrls.has(s.url));
  console.log(`🆕 ${newStories.length} new stories to process`);
  
  if (newStories.length === 0) {
    console.log('✅ No new stories to add. Done!');
    return;
  }
  
  // Process with AI
  const processed = await processStoriesWithAI(newStories);
  
  // Merge with original story data
  const today = new Date().toISOString().slice(0, 10);
  const newItems = newStories.map((story, i) => ({
    id: story.id,
    titleEn: processed[i]?.titleEn || story.title,
    titleZh: processed[i]?.titleZh || story.title,
    summaryEn: processed[i]?.summaryEn || '',
    summaryZh: processed[i]?.summaryZh || '',
    tag: processed[i]?.tag || 'Tech',
    source: story.source,
    sourceUrl: story.url,
    publishedAt: today,
    score: story.score,
    featured: processed[i]?.featured || false,
  }));
  
  // Combine: new items first, then existing (up to MAX_ITEMS_TO_KEEP)
  const combined = [...newItems, ...existingNews].slice(0, MAX_ITEMS_TO_KEEP);
  
  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combined, null, 2));
  
  console.log(`\n✅ Done! Added ${newItems.length} new items. Total: ${combined.length}`);
  console.log(`📄 Output: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
