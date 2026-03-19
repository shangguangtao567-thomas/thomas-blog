import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import { loadSiteConfig } from './lib/site-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const POSTS_INDEX_FILE = path.join(DATA_DIR, 'posts-index.json');
const DIGESTS_FILE = path.join(DATA_DIR, 'ai-digests.json');

const POSTS_DIR = path.join(ROOT, 'posts');
const siteConfig = loadSiteConfig();
const SITE_URL = (process.env.SITE_URL || siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
const DEFAULT_TITLE = `Thomas · AI, Open Source, and Agent-era Engineering`;
const DEFAULT_DESCRIPTION = `Durable notes on AI infrastructure, open source tooling, and the mechanics of building in the agent era. I track what's actually shipping, not what's being announced.`;

marked.setOptions({ gfm: true });

function ensureDistExists() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ not found. Run vite build before postbuild-static-routes.');
  }
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function routeUrl(routePath = '') {
  const normalized = String(routePath || '').replace(/^\/+|\/+$/g, '');
  return normalized ? `${SITE_URL}/${normalized}/` : `${SITE_URL}/`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

function escapeXml(value = '') {
  return escapeAttr(value).replace(/'/g, '&apos;');
}

function stripMarkdown(text = '') {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#>*_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text = '', max = 180) {
  const normalized = stripMarkdown(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

function formatDisplayDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr) {
  try {
    const d = new Date(dateStr);
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    return `${mo}/${dy}`;
  } catch {
    return '  /  ';
  }
}

function upsertTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
}

function upsertMeta(html, attr, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attr}="${escapedKey}"[^>]*>`, 'i');
  return upsertTag(html, pattern, `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`);
}

function upsertLink(html, rel, href, extras = '') {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<link\\s+rel="${escapedRel}"[^>]*>`, 'i');
  const attrs = `${extras ? ` ${extras}` : ''}`.trim();
  return upsertTag(html, pattern, `<link rel="${rel}" href="${escapeAttr(href)}"${attrs ? ` ${attrs}` : ''} />`);
}

function injectIntoHead(html, snippet) {
  return html.replace('</head>', `  ${snippet}\n</head>`);
}

function injectRootContent(html, content) {
  // Use regex to replace entire root div (not just empty ones)
  return html.replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root">${content}</div>`);
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
}

function renderShell(template, route) {
  let html = template;
  html = setTitle(html, route.title);
  html = upsertMeta(html, 'name', 'description', route.description);
  html = upsertMeta(html, 'name', 'robots', route.robots || 'index,follow');
  html = upsertMeta(html, 'property', 'og:type', route.type || 'website');
  html = upsertMeta(html, 'property', 'og:site_name', siteConfig.siteName);
  html = upsertMeta(html, 'property', 'og:title', route.title);
  html = upsertMeta(html, 'property', 'og:description', route.description);
  html = upsertMeta(html, 'property', 'og:url', route.url);
  html = upsertMeta(html, 'name', 'twitter:card', route.image ? 'summary_large_image' : 'summary');
  html = upsertMeta(html, 'name', 'twitter:title', route.title);
  html = upsertMeta(html, 'name', 'twitter:description', route.description);
  html = upsertMeta(html, 'name', 'twitter:site', '@GuangtaoS29545');
  html = upsertMeta(html, 'name', 'twitter:creator', '@GuangtaoS29545');
  html = upsertLink(html, 'canonical', route.url);
  html = upsertLink(html, 'alternate', `${SITE_URL}/feed.xml`, 'type="application/rss+xml" title="RSS Feed"');

  if (route.keywords?.length) {
    html = upsertMeta(html, 'name', 'keywords', route.keywords.join(', '));
  }

  if (route.image) {
    html = upsertMeta(html, 'property', 'og:image', route.image);
    html = upsertMeta(html, 'name', 'twitter:image', route.image);
  }

  if (route.publishedAt) {
    html = upsertMeta(html, 'property', 'article:published_time', route.publishedAt);
  }

  if (route.jsonLd) {
    html = injectIntoHead(html, `<script type="application/ld+json">\n${route.jsonLd}\n  </script>`);
  }

  return html;
}

function writeRouteHtml(template, routePath, route, bodyHtml = '') {
  const normalized = String(routePath || '').replace(/^\/+|\/+$/g, '');
  const targetDir = normalized ? path.join(DIST_DIR, normalized) : DIST_DIR;
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, 'index.html');

  let html = renderShell(template, route);
  if (bodyHtml) {
    html = injectRootContent(html, bodyHtml);
  }

  fs.writeFileSync(targetFile, html);
}

function write404Page() {
  const file = path.join(DIST_DIR, '404.html');
  const html = fs.readFileSync(path.join(ROOT, 'public', '404.html'), 'utf-8');
  fs.writeFileSync(file, html);
}

function writeCname() {
  const hostname = new URL(`${SITE_URL}/`).hostname;
  if (!hostname.endsWith('github.io')) {
    fs.writeFileSync(path.join(DIST_DIR, 'CNAME'), `${hostname}\n`);
  }
}

function renderStaticHome({ posts, digests }) {
  const latestPosts = posts.slice(0, 6).map((post) => `
    <a href="${routeUrl(`blog/${post.slug}`)}" class="post-item" style="text-decoration: none;">
      <span class="post-item-date">${formatDateShort(post.publishedAt)}</span>
      <div class="post-item-title">${escapeHtml(post.titleEn)}</div>
      ${post.tagEn ? `<span class="post-item-tag">${escapeHtml(post.tagEn)}</span>` : ''}
    </a>
  `).join('\n');

  const digestItems = digests.slice(0, 3).map(digest => `
    <a href="${digest.path || `/blog/${digest.slug}`}" class="post-item" style="text-decoration: none;">
      <span class="post-item-date">${formatDateShort(digest.date)}</span>
      <div class="post-item-title">${escapeHtml(digest.titleEn)}</div>
      <span class="post-item-tag">digest</span>
    </a>
  `).join('\n');

  return `
    <div class="site-container fade-in" style="padding-top: 4rem; padding-bottom: 6rem;">
      <section style="margin-bottom: 4rem;">
        <h1 style="font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 0.75rem; letter-spacing: -0.01em;">Thomas</h1>
        <p style="font-size: 0.9rem; color: #888888; line-height: 1.7; max-width: 520px; margin-bottom: 1.25rem;">${DEFAULT_DESCRIPTION}</p>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <a href="https://x.com/GuangtaoS29545" target="_blank" rel="noopener noreferrer" class="x-cta">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Follow on X
          </a>
          <a href="./feed.xml" style="font-size: 0.75rem; color: #6b6b6b;">RSS ↗</a>
        </div>
      </section>
      <section style="margin-bottom: 4rem;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;"><p class="section-label">Writing</p><a href="/blog" style="font-size: 0.75rem; color: #6b6b6b;">All posts →</a></div>
        <div>${latestPosts}</div>
      </section>
      <section>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 1rem;"><p class="section-label">AI Briefing</p><a href="/briefing" style="font-size: 0.75rem; color: #6b6b6b;">Archive →</a></div>
        <div>${digestItems}</div>
      </section>
    </div>
  `;
}

// --- AI Daily Digest page builder ---
function parseDigestFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') return {};
  const result = {};
  let i = 1;
  while (i < lines.length && lines[i] !== '---') {
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx > 0) {
      const key = lines[i].slice(0, colonIdx).trim();
      const value = lines[i].slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
      result[key] = value;
    }
    i++;
  }
  return result;
}

function extractContentEn(content) {
  const marker = '<!-- CONTENT_EN -->';
  const idx = content.indexOf(marker);
  if (idx === -1) return content;
  return content.slice(idx + marker.length).trim();
}

function stripFrontmatter(content) {
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('---', 3);
  if (end === -1) return content;
  return content.slice(end + 3).trim();
}

async function buildDigestPages(template, digests) {
  if (!digests || digests.length === 0) {
    console.log('  (no AI daily digests to prerender)');
    return;
  }

  // Read all ai-daily markdown files
  const digestFiles = fs.readdirSync(POSTS_DIR)
    .filter(f => f.startsWith('ai-daily-') && f.endsWith('.md'))
    .sort()
    .reverse();

  const slugToMarkdown = {};
  for (const file of digestFiles) {
    const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    slugToMarkdown[file] = content;
  }

  let count = 0;
  for (const digest of digests) {
    // Find matching markdown file
    const slug = digest.slug || `ai-daily-${digest.date}`;
    const possibleFiles = [
      `${digest.date}-${slug}.md`,
      `${digest.date}-${slug.replace('/', '-')}.md`,
    ];
    let mdContent = null;
    let mdFile = null;
    for (const f of possibleFiles) {
      if (fs.existsSync(path.join(POSTS_DIR, f))) {
        mdContent = fs.readFileSync(path.join(POSTS_DIR, f), 'utf-8');
        mdFile = f;
        break;
      }
    }
    if (!mdContent) {
      // Try glob-style search
      const matched = digestFiles.find(f => f.includes(digest.date) && f.includes('ai-daily'));
      if (matched) {
        mdContent = slugToMarkdown[matched];
        mdFile = matched;
      }
    }

    if (!mdContent) {
      console.warn(`  [digest] no markdown for ${slug}, skipping HTML generation`);
      continue;
    }

    // Parse frontmatter + content
    const frontmatter = parseDigestFrontmatter(mdContent);
    const rawContent = extractContentEn(mdContent);
    const bodyHtml = marked.parse(rawContent || '');

    const bodyContent = bodyHtml ||
      `<p style="color:#888;">Full content not available. Visit the <a href="${SITE_URL}/briefing">briefing archive</a>.</p>`;

    const route = {
      title: `${digest.titleEn || frontmatter.titleEn || slug} · Thomas`,
      description: truncateText(digest.excerptEn || frontmatter.excerptEn || '', 155),
      url: routeUrl(`blog/${slug}`),
      type: 'article',
      publishedAt: digest.date ? new Date(digest.date).toISOString() : undefined,
      keywords: ['AI Daily', 'digest'],
    };

    const bodyPageHtml = `
      <div class="site-container fade-in" style="padding-top: 3rem; padding-bottom: 6rem;">
        <a href="/briefing" style="font-size: 0.8125rem; color: #6b6b6b; display: inline-flex; align-items: center; gap: 0.25rem; margin-bottom: 2.5rem; transition: color 0.15s;">← AI Briefing</a>
        <header style="margin-bottom: 2.5rem;">
          <span class="tag-pill" style="margin-bottom: 0.75rem; display: inline-block; background: #1f1f1f; color: #888; font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 4px;">AI Daily</span>
          <h1 style="font-size: 1.5rem; font-weight: 600; color: #ffffff; line-height: 1.3; letter-spacing: -0.025em; margin-bottom: 0.75rem; margin-top: 0.5rem;">${escapeHtml(digest.titleEn || frontmatter.titleEn || slug)}</h1>
          <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; color: #6b6b6b;">${formatDisplayDate(digest.date || frontmatter.date)}</span>
            ${digest.itemCount ? `<span style="font-size: 0.8rem; color: #6b6b6b;">${digest.itemCount} items</span>` : ''}
            ${digest.bodyCoverage?.totalWords ? `<span style="font-size: 0.8rem; color: #6b6b6b;">${digest.bodyCoverage.totalWords} words</span>` : ''}
          </div>
          ${(digest.excerptEn || frontmatter.excerptEn) ? `<p style="font-size: 0.9375rem; color: #888888; line-height: 1.65; margin-top: 1rem; border-left: 2px solid #1f1f1f; padding-left: 1rem;">${escapeHtml(digest.excerptEn || frontmatter.excerptEn)}</p>` : ''}
        </header>
        <hr style="border: none; border-top: 1px solid #1f1f1f; margin-bottom: 2.5rem;" />
        <div class="prose-blog">${bodyContent}</div>
        <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #1f1f1f;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <a href="/briefing" style="font-size: 0.8125rem; color: #6b6b6b;">← Back to AI Briefing</a>
            <a href="https://x.com/intent/tweet?text=${encodeURIComponent(digest.titleEn || slug)}&url=${encodeURIComponent(routeUrl(`blog/${slug}`))}&via=GuangtaoS29545" target="_blank" rel="noopener noreferrer" style="font-size: 0.75rem; color: #6b6b6b; display: inline-flex; align-items: center; gap: 0.3rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </a>
          </div>
        </div>
      </div>
    `;

    let html = renderShell(template, route);
    html = injectRootContent(html, bodyPageHtml);

    // Write to file (same as writeRouteHtml but with pre-built html)
    const normalized = `blog/${slug}`.replace(/^\/+|\/+$/g, '');
    const targetDir = path.join(DIST_DIR, normalized);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, 'index.html'), html);
    count++;
  }

  console.log(`  ✓ built ${count} AI daily digest pages`);
}

async function main() {
  ensureDistExists();
  const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');

  const posts = loadJson(POSTS_INDEX_FILE, []).filter(p => !p.slug.startsWith('ai-daily-'));
  const allPosts = loadJson(POSTS_FILE, []).filter(p => !p.slug.startsWith('ai-daily-'));
  const digests = loadJson(DIGESTS_FILE, []);

  const baseRoute = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: routeUrl(),
  };

  // Home page
  const homeHtml = renderStaticHome({ posts, digests });
  writeRouteHtml(template, '/', baseRoute, homeHtml);

  // Blog list page
  const blogRoute = { ...baseRoute, title: `Writing · ${siteConfig.siteName}`, url: routeUrl('blog') };
  const blogHtml = `
    <div class="site-container fade-in" style="padding-top: 3rem; padding-bottom: 6rem;">
      <div style="margin-bottom: 2.5rem;">
        <h1 style="font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 0.5rem; letter-spacing: -0.01em;">Writing</h1>
        <p style="font-size: 0.875rem; color: #6b6b6b;">${posts.length} posts on AI, open source, and building in the agent era.</p>
      </div>
      <div>
        ${posts.map(post => `
          <a href="/blog/${post.slug}" class="post-item" style="text-decoration: none;">
            <span class="post-item-date">${formatDateShort(post.publishedAt)}</span>
            <div style="flex: 1; min-width: 0;">
              <div class="post-item-title">${escapeHtml(post.titleEn)}</div>
              ${post.excerptEn ? `<div style="font-size: 0.8rem; color: #6b6b6b; margin-top: 0.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(post.excerptEn)}</div>` : ''}
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0;">
              ${post.tagEn ? `<span class="post-item-tag">${escapeHtml(post.tagEn)}</span>` : ''}
              ${post.readTime ? `<span style="font-size: 0.65rem; color: #6b6b6b; font-family: 'JetBrains Mono', monospace;">${post.readTime}m</span>` : ''}
            </div>
          </a>
        `).join('\n')}
      </div>
    </div>
  `;
  writeRouteHtml(template, 'blog', blogRoute, blogHtml);

  // Briefing list page
  const briefingRoute = { ...baseRoute, title: `AI Briefing · ${siteConfig.siteName}`, url: routeUrl('briefing') };
  const briefingHtml = `
    <div class="site-container fade-in" style="padding-top: 3rem; padding-bottom: 6rem;">
      <div style="margin-bottom: 2.5rem;">
        <h1 style="font-size: 1.125rem; font-weight: 600; color: #ffffff; margin-bottom: 0.5rem; letter-spacing: -0.01em;">AI Briefing</h1>
        <p style="font-size: 0.875rem; color: #6b6b6b;">Daily digests on AI infrastructure, open source models, and developer tooling.</p>
      </div>
      <div>
        ${digests.map(digest => `
          <a href="${digest.path || `/blog/${digest.slug}`}" class="post-item" style="text-decoration: none;">
            <span class="post-item-date">${formatDateShort(digest.date)}</span>
            <div style="flex: 1; min-width: 0;">
              <div class="post-item-title">${escapeHtml(digest.titleEn)}</div>
              ${digest.excerptEn ? `<div style="font-size: 0.8rem; color: #6b6b6b; margin-top: 0.2rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(digest.excerptEn)}</div>` : ''}
            </div>
            ${digest.itemCount ? `<span class="post-item-tag">${digest.itemCount} items</span>` : ''}
          </a>
        `).join('\n')}
      </div>
    </div>
  `;
  writeRouteHtml(template, 'briefing', briefingRoute, briefingHtml);
  writeRouteHtml(template, 'tech', briefingRoute, briefingHtml); // Also keep /tech for old links

  // Article pages
  for (const post of allPosts) {
    const articleRoute = {
      ...baseRoute,
      title: `${post.titleEn} · Thomas`,
      description: truncateText(post.excerptEn || post.contentEn, 155),
      url: routeUrl(`blog/${post.slug}`),
      type: 'article',
      publishedAt: post.publishedAt,
      image: post.image,
      keywords: post.keywords || [],
      section: post.tagEn || 'Tech',
    };

    const bodyHtml = `
      <div class="site-container fade-in" style="padding-top: 3rem; padding-bottom: 6rem;">
        <a href="/blog" style="font-size: 0.8125rem; color: #6b6b6b; display: inline-flex; align-items: center; gap: 0.25rem; margin-bottom: 2.5rem; transition: color 0.15s;">← Writing</a>
        <header style="margin-bottom: 2.5rem;">
          ${post.tagEn ? `<span class="tag-pill" style="margin-bottom: 0.75rem; display: inline-block;">${escapeHtml(post.tagEn)}</span>` : ''}
          <h1 style="font-size: 1.625rem; font-weight: 600; color: #ffffff; line-height: 1.3; letter-spacing: -0.025em; margin-bottom: 0.75rem; margin-top: 0.5rem;">${escapeHtml(post.titleEn)}</h1>
          <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 0.8rem; color: #6b6b6b;">${formatDisplayDate(post.publishedAt)}</span>
            ${post.readTime ? `<span style="font-size: 0.8rem; color: #6b6b6b;">${post.readTime} min read</span>` : ''}
          </div>
          ${post.excerptEn ? `<p style="font-size: 0.9375rem; color: #888888; line-height: 1.65; margin-top: 1rem; border-left: 2px solid #1f1f1f; padding-left: 1rem;">${escapeHtml(post.excerptEn)}</p>` : ''}
        </header>
        <hr style="border: none; border-top: 1px solid #1f1f1f; margin-bottom: 2.5rem;" />
        <div class="prose-blog">${marked.parse(post.contentEn || '')}</div>
        <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #1f1f1f;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <a href="/blog" style="font-size: 0.8125rem; color: #6b6b6b;">← Back to writing</a>
            <a href="https://x.com/intent/tweet?text=${encodeURIComponent(post.titleEn)}&url=${encodeURIComponent(routeUrl(`blog/${post.slug}`))}&via=GuangtaoS29545" target="_blank" rel="noopener noreferrer" class="x-cta">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X
            </a>
          </div>
        </div>
      </div>
    `;
    writeRouteHtml(template, `blog/${post.slug}`, articleRoute, bodyHtml);
  }

  // RSS Feed
  const feedItems = posts.map(post => {
    const url = routeUrl(`blog/${post.slug}`);
    const content = marked.parse(post.contentEn || '');
    return `
      <item>
        <title>${escapeXml(post.titleEn)}</title>
        <link>${url}</link>
        <guid>${url}</guid>
        <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(truncateText(post.excerptEn || post.contentEn, 500))}</description>
        <content:encoded><![CDATA[${content}]]></content:encoded>
      </item>
    `;
  }).join('');

  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.siteName)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(DEFAULT_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    ${feedItems}
  </channel>
</rss>`;
  fs.writeFileSync(path.join(DIST_DIR, 'feed.xml'), rssXml);

  // Sitemap
  const sitemapEntries = posts.map(post => ({
    loc: routeUrl(`blog/${post.slug}`),
    lastmod: new Date(post.publishedAt).toISOString(),
  }));
  sitemapEntries.unshift({ loc: routeUrl(), lastmod: new Date().toISOString() });
  sitemapEntries.unshift({ loc: routeUrl('blog'), lastmod: new Date().toISOString() });
  sitemapEntries.unshift({ loc: routeUrl('briefing'), lastmod: new Date().toISOString() });

  // Add digest pages to sitemap
  const digestSitemapEntries = digests.map(digest => ({
    loc: routeUrl(`blog/${digest.slug}`),
    lastmod: new Date(digest.date).toISOString(),
  }));
  sitemapEntries.push(...digestSitemapEntries);

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries.map(entry => `
    <url>
      <loc>${entry.loc}</loc>
      <lastmod>${entry.lastmod}</lastmod>
    </url>
  `).join('')}
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);

  // --- AI Daily Digest HTML pages ---
  await buildDigestPages(template, digests);

  // Other static files
  write404Page();
  writeCname();
  fs.copyFileSync(path.join(ROOT, 'public', 'robots.txt'), path.join(DIST_DIR, 'robots.txt'));

  console.log('✓ Static routes: prerendered all pages, feed.xml, sitemap.xml, robots.txt, CNAME, and 404.html');
}

main().catch(console.error);
