/**
 * build-data.mjs
 * Reads all Markdown files in /posts directory and generates:
 * - src/data/posts-index.json  (metadata only, for listing)
 * - src/data/posts.json        (full content, for detail pages)
 * 
 * Run: node scripts/build-data.mjs
 * This runs automatically before vite build.
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
    excerptZh: frontmatter.excerptZh || frontmatter.excerpt || '',
    excerptEn: frontmatter.excerptEn || frontmatter.excerpt || '',
    tag: frontmatter.tag || 'Tech',
    tagEn: frontmatter.tagEn || frontmatter.tag || 'Tech',
    image: frontmatter.image || '',
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

console.log(`✓ Built ${posts.length} posts → src/data/posts-index.json & posts.json`);

// Ensure AI data files exist for static imports
for (const [filename, label, fallback] of [
  ['tech-news.json', 'tech-news', []],
  ['ai-digests.json', 'ai-digests', []],
  ['ai-digest-details.json', 'ai-digest-details', []],
  ['ai-digest-report.json', 'ai-digest-report', {}],
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
