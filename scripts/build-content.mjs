/**
 * Build script: Parse all Markdown posts → generate src/data/posts.json
 * Run: node scripts/build-content.mjs
 * Also called automatically by: pnpm build (via prebuild hook)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'posts');
const dataDir = path.join(__dirname, '..', 'src', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/**
 * Parse YAML-style frontmatter from markdown content.
 * Supports string, number, and boolean values.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { data: {}, body: content };

  const yamlStr = match[1];
  const body = content.slice(match[0].length).trim();
  const data = {};

  for (const line of yamlStr.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }

    data[key] = value;
  }

  return { data, body };
}

/**
 * Extract language-specific content blocks from markdown body.
 * Expects <!-- CONTENT_EN --> and <!-- CONTENT_ZH --> markers.
 */
function extractContent(body) {
  const enMatch = body.match(/<!-- CONTENT_EN -->\n([\s\S]*?)(?=\n<!-- CONTENT_ZH -->|$)/);
  const zhMatch = body.match(/<!-- CONTENT_ZH -->\n([\s\S]*?)$/);

  return {
    contentEn: enMatch ? enMatch[1].trim() : body,
    contentZh: zhMatch ? zhMatch[1].trim() : '',
  };
}

// Read and parse all markdown files
const files = fs.readdirSync(postsDir)
  .filter(f => f.endsWith('.md'))
  .sort()
  .reverse(); // newest first

const posts = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(postsDir, file), 'utf-8');
  const { data, body } = parseFrontmatter(raw);
  const { contentEn, contentZh } = extractContent(body);

  posts.push({
    slug: data.slug || file.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace('.md', ''),
    titleZh: data.titleZh || '',
    titleEn: data.titleEn || '',
    excerptZh: data.excerptZh || '',
    excerptEn: data.excerptEn || '',
    tag: data.tag || 'Tech',
    tagEn: data.tagEn || 'Tech',
    image: data.image || '',
    readTime: data.readTime || 5,
    publishedAt: data.publishedAt || '',
    contentEn,
    contentZh,
  });
}

// Write posts.json
const outputPath = path.join(dataDir, 'posts.json');
fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf-8');
console.log(`✅ Built ${posts.length} posts → src/data/posts.json`);

// Also write a lightweight index (no content) for listing pages
const index = posts.map(({ contentEn, contentZh, ...meta }) => meta);
const indexPath = path.join(dataDir, 'posts-index.json');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
console.log(`✅ Built posts index → src/data/posts-index.json`);
