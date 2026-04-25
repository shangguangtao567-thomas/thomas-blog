/**
 * build-data.mjs
 * Reads all Markdown files in /posts directory and generates:
 * - src/data/posts-index.json  (metadata only, for listing)
 * - src/data/posts.json        (full content, for detail pages)
 * 
 * Run manually when you intentionally want to regenerate source data:
 * node scripts/build-data.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'posts');
const DATA_DIR = path.join(ROOT, 'src', 'data');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

// Check if posts directory exists
if (!fs.existsSync(POSTS_DIR)) {
  fs.mkdirSync(POSTS_DIR, { recursive: true });
  console.log('Created posts/ directory');
}

function extractContentSections(body) {
  const enMatch = body.match(/<!-- CONTENT_EN -->\n([\s\S]*?)(?=\n<!-- CONTENT_ZH -->|$)/);
  const zhMatch = body.match(/<!-- CONTENT_ZH -->\n([\s\S]*?)$/);

  return {
    contentEn: enMatch ? enMatch[1].trim() : body.trim(),
    contentZh: zhMatch ? zhMatch[1].trim() : '',
  };
}

function parseKeywords(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeTopicLabel(value, fallback) {
  return String(value || fallback || 'Tech').trim();
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Read all markdown files
const files = fs.readdirSync(POSTS_DIR)
  .filter(f => f.endsWith('.md'))
  .sort()
  .reverse(); // Newest first (by filename date prefix)

const posts = files.map(filename => {
  const filePath = path.join(POSTS_DIR, filename);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);
  const { contentEn, contentZh } = extractContentSections(content);

  // Derive slug from filename: YYYY-MM-DD-slug.md -> slug
  const slug = filename
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .replace(/\.md$/, '');

  return {
    slug,
    kind: frontmatter.kind || '',
    titleZh: frontmatter.titleZh || frontmatter.title || slug,
    titleEn: frontmatter.titleEn || frontmatter.title || slug,
    seoTitleZh: frontmatter.seoTitleZh || '',
    seoTitleEn: frontmatter.seoTitleEn || '',
    excerptZh: frontmatter.excerptZh || frontmatter.excerpt || '',
    excerptEn: frontmatter.excerptEn || frontmatter.excerpt || '',
    keywords: parseKeywords(frontmatter.keywords),
    pillar: frontmatter.pillar || '',
    pillarZh: frontmatter.pillarZh || '',
    topicSlug: slugify(normalizeTopicLabel(frontmatter.pillar || frontmatter.tagEn, frontmatter.tag)),
    featured: Boolean(frontmatter.featured),
    xHookZh: frontmatter.xHookZh || '',
    xHookEn: frontmatter.xHookEn || '',
    tag: frontmatter.tag || 'Tech',
    tagEn: frontmatter.tagEn || frontmatter.tag || 'Tech',
    image: frontmatter.image || '',
    hideHero: frontmatter.hideHero ? true : undefined,
    readTime: frontmatter.readTime || Math.ceil(content.split(' ').length / 200),
    publishedAt: frontmatter.date || frontmatter.publishedAt || filename.slice(0, 10),
    contentEn: frontmatter.lang === 'zh' ? '' : contentEn,
    contentZh: frontmatter.lang === 'zh' ? content : contentZh,
  };
});

// Write posts-index.json (no content, for listing)
const postsIndex = posts.map(({ contentEn, contentZh, ...meta }) => meta);
fs.writeFileSync(
  path.join(DATA_DIR, 'posts-index.json'),
  JSON.stringify(postsIndex, null, 2)
);

// Write posts.json (with content, for detail pages)
fs.writeFileSync(
  path.join(DATA_DIR, 'posts.json'),
  JSON.stringify(posts, null, 2)
);

const topicMap = new Map();
for (const post of posts.filter(item => !item.slug.startsWith('ai-daily-'))) {
  const key = post.topicSlug || slugify(post.pillar || post.tagEn || post.tag);
  if (!key) continue;
  const existing = topicMap.get(key) || {
    slug: key,
    labelZh: post.pillarZh || post.tag,
    labelEn: post.pillar || post.tagEn || post.tag,
    count: 0,
    latestPostSlugs: [],
  };
  existing.count += 1;
  existing.latestPostSlugs = [post.slug, ...existing.latestPostSlugs.filter(item => item !== post.slug)].slice(0, 6);
  topicMap.set(key, existing);
}

const topics = Array.from(topicMap.values()).sort((a, b) => b.count - a.count || a.labelEn.localeCompare(b.labelEn));
fs.writeFileSync(
  path.join(DATA_DIR, 'topics.json'),
  JSON.stringify(topics, null, 2)
);

console.log(`✓ Built ${posts.length} posts → src/data/posts-index.json & posts.json`);
console.log(`✓ Built ${topics.length} topics → src/data/topics.json`);

// Ensure AI data files exist for static imports
for (const [filename, label, fallback] of [
  ['tech-news.json', 'tech-news', []],
  ['ai-digests.json', 'ai-digests', []],
  ['ai-digest-details.json', 'ai-digest-details', []],
  ['ai-digest-report.json', 'ai-digest-report', {}],
  ['x-drafts.json', 'x-drafts', []],
  ['weekly-content-opportunities.json', 'weekly-content-opportunities', []],
]) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
    console.log(`✓ Created empty src/data/${filename}`);
  } else {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const size = Array.isArray(payload) ? payload.length : Object.keys(payload).length;
    console.log(`✓ ${label}: ${size} item${size === 1 ? '' : 's'}`);
  }
}
