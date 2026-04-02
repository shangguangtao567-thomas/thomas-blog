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

const siteConfig = loadSiteConfig();
const SITE_URL = (process.env.SITE_URL || siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
const DEFAULT_TITLE = 'Thomas · AI, Open Source, and Agent-era Engineering';
const DEFAULT_DESCRIPTION = "Durable notes on AI infrastructure, open source tooling, and the mechanics of building in the agent era. I track what's actually shipping, not what's being announced.";

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
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[#>-]/g, ' ')
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
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatShortDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '00/00';
  }
}

function bodyContainsImage(markdown = '', imagePath = '') {
  const normalizedPath = String(imagePath || '').trim();
  if (!markdown || !normalizedPath) return false;
  return markdown.includes(`](${normalizedPath})`) || markdown.includes(`src="${normalizedPath}"`);
}

function enhanceArticleHtml(html = '') {
  return String(html || '').replace(/<img\b([^>]*)>/gi, (_match, attrs = '') => {
    let nextAttrs = attrs;
    if (!/\bloading=/.test(nextAttrs)) nextAttrs += ' loading="lazy"';
    if (!/\bdecoding=/.test(nextAttrs)) nextAttrs += ' decoding="async"';
    return `<img${nextAttrs}>`;
  });
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
    const absoluteImage = route.image.startsWith('/') ? `${SITE_URL}${route.image}` : route.image;
    html = upsertMeta(html, 'property', 'og:image', absoluteImage);
    html = upsertMeta(html, 'name', 'twitter:image', absoluteImage);
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

  let html = renderShell(template, route);
  if (bodyHtml) {
    html = injectRootContent(html, bodyHtml);
  }

  fs.writeFileSync(path.join(targetDir, 'index.html'), html);
}

function write404Page() {
  fs.copyFileSync(path.join(ROOT, 'public', '404.html'), path.join(DIST_DIR, '404.html'));
}

function writeCname() {
  const hostname = new URL(`${SITE_URL}/`).hostname;
  if (!hostname.endsWith('github.io')) {
    fs.writeFileSync(path.join(DIST_DIR, 'CNAME'), `${hostname}\n`);
  }
}

function normalizeTitle(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titlesOverlap(left = '', right = '') {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  // Fuzzy match: if both start with "ai daily", treat as overlapping (same digest, different title variants)
  if (normalizedLeft.startsWith('ai daily') && normalizedRight.startsWith('ai daily')) return true;
  // Fuzzy prefix match for other titles
  const wordsLeft = normalizedLeft.split(/\s+/);
  const wordsRight = normalizedRight.split(/\s+/);
  const minLen = Math.min(wordsLeft.length, wordsRight.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i++) { if (wordsLeft[i] === wordsRight[i]) shared++; else break; }
    if (shared >= 4 && shared >= minLen * 0.5) return true;
  }
  return false;
}

function stripRedundantLeadingMarkdownH1(markdown = '', title = '') {
  const match = String(markdown).match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match) return markdown;
  if (!titlesOverlap(match[1], title)) return markdown;
  return String(markdown).replace(/^\s*#\s+.+?\s*(?:\n+|$)/, '');
}

function stripRedundantLeadingHtmlH1(html = '', title = '') {
  const match = String(html).match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
  if (!match) return html;
  if (!titlesOverlap(match[1], title)) return html;
  return String(html).replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}

function stripDigestSignature(markdown = '') {
  return String(markdown).replace(/\n+(?:---\s*\n+)?\*?AI\s+Daily\s*\|[^\n]*\*?\s*$/i, '');
}

function safeLink(pathOrUrl) {
  if (!pathOrUrl) return '#';
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
}

function renderTagPill(label) {
  if (!label) return '';
  return `<span class="tag-pill">${escapeHtml(label)}</span>`;
}

function renderBriefingChips(themes = [], max = 2) {
  return themes
    .slice(0, max)
    .filter((theme) => theme?.themeEn)
    .map((theme) => `<span class="briefing-chip">${escapeHtml(theme.themeEn)}</span>`)
    .join('');
}

function renderDetailChips(items = [], max = 6) {
  return items
    .slice(0, max)
    .filter(Boolean)
    .map((item) => `<span class="detail-chip">${escapeHtml(item)}</span>`)
    .join('');
}

function renderStaticHome({ posts, digests }) {
  const heroPost = posts[0];
  const morePosts = posts.slice(1, 7);
  const latestDigests = digests.slice(0, 3);

  return `
    <div class="site-container-wide page-shell page-shell--home fade-in">
      ${heroPost ? `
      <section class="hero-editorial slide-up">
        <div class="hero-editorial__intro">
          <p class="eyebrow">Latest</p>
          <h1 class="hero-editorial__headline">
            <a href="/blog/${heroPost.slug}">${escapeHtml(heroPost.titleEn)}</a>
          </h1>
          <p class="hero-editorial__excerpt">${escapeHtml(heroPost.excerptEn || '')}</p>
          <div class="hero-editorial__meta">
            <time>${formatDisplayDate(heroPost.publishedAt)}</time>
            <span>${heroPost.readTime} min read</span>
            ${heroPost.tagEn ? renderTagPill(heroPost.tagEn) : ''}
          </div>
          <a href="/blog/${heroPost.slug}" class="button-link" style="margin-top:1.5rem">Read article &rarr;</a>
        </div>
        ${heroPost.image ? `
        <a href="/blog/${heroPost.slug}" class="hero-editorial__image-wrap">
          <img src="${escapeAttr(heroPost.image)}" alt="" class="hero-editorial__image" loading="eager" />
        </a>` : ''}
      </section>
      ` : ''}

      <section class="home-section slide-up slide-up-delay-1">
        <div class="section-head">
          <div>
            <p class="section-label">Writing</p>
            <h2 class="section-head__title">More essays &amp; guides</h2>
          </div>
          <a href="/blog" class="section-head__link">All writing &rarr;</a>
        </div>

        <div class="post-grid">
          ${morePosts.map((post) => `
            <a href="/blog/${post.slug}" class="post-card">
              ${post.image ? `<div class="post-card__img-wrap"><img src="${escapeAttr(post.image)}" alt="" class="post-card__img" loading="lazy" /></div>` : ''}
              <div class="post-card__body">
                <div class="post-card__meta">
                  <time>${formatDisplayDate(post.publishedAt)}</time>
                  <span>${post.readTime} min</span>
                  ${post.tagEn ? renderTagPill(post.tagEn) : ''}
                </div>
                <h3 class="post-card__title">${escapeHtml(post.titleEn)}</h3>
                <p class="post-card__excerpt">${escapeHtml(post.excerptEn || '')}</p>
              </div>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="home-section slide-up slide-up-delay-2">
        <div class="section-head">
          <div>
            <p class="section-label">AI Briefing</p>
            <h2 class="section-head__title">Daily intelligence</h2>
          </div>
          <a href="/briefing" class="section-head__link">Full archive &rarr;</a>
        </div>

        <div class="briefing-grid">
          ${latestDigests.map((digest) => `
            <a href="${escapeAttr(safeLink(digest.path || `/blog/${digest.slug}`))}" class="briefing-card">
              <div class="briefing-card__meta">
                <span>${formatDisplayDate(digest.date)}</span>
                ${digest.itemCount ? `<span>${digest.itemCount} items</span>` : ''}
              </div>
              <h3 class="briefing-card__title">${escapeHtml(digest.titleEn)}</h3>
              ${digest.excerptEn ? `<p class="briefing-card__excerpt">${escapeHtml(stripMarkdown(digest.excerptEn))}</p>` : ''}
              <div class="briefing-card__themes">${renderBriefingChips(digest.themes || [], 2)}</div>
            </a>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderStaticBlog(posts) {
  const leadPost = posts[0];
  const restPosts = posts.slice(1);

  return `
    <div class="site-container-wide page-shell fade-in">
      <section class="home-section">
        <div class="section-head">
          <div>
            <p class="section-label">Writing</p>
            <h1 class="section-head__title">Latest articles</h1>
            <p class="section-head__copy">${posts.length} essays, reviews, and explainers.</p>
          </div>
        </div>

        ${leadPost ? `
          <a href="/blog/${leadPost.slug}" class="feature-card feature-card--lead">
            <div>
              <p class="section-label">Latest</p>
              <div class="feature-card__meta">
                <span>${formatDisplayDate(leadPost.publishedAt)}</span>
                <span>${leadPost.readTime} min read</span>
                ${leadPost.tagEn ? renderTagPill(leadPost.tagEn) : ''}
              </div>
              <h2 class="feature-card__title">${escapeHtml(leadPost.titleEn)}</h2>
              <p class="feature-card__excerpt">${escapeHtml(leadPost.excerptEn || '')}</p>
            </div>
            <div class="feature-card__footer">
              <span class="button-link--ghost">Read lead story</span>
            </div>
          </a>
        ` : ''}
      </section>

      <section class="home-section">
        <div class="story-list">
          ${restPosts.map((post) => {
            const showTag = post.tagEn && String(post.kind || '').toLowerCase() !== String(post.tagEn || '').toLowerCase();
            return `
              <a href="/blog/${post.slug}" class="story-row">
                <div class="story-row__date">${formatShortDate(post.publishedAt)}</div>
                <div class="story-row__body">
                  <div class="story-row__meta">
                    ${post.kind ? `<span class="meta-kicker">${escapeHtml(post.kind)}</span>` : ''}
                    ${showTag ? renderTagPill(post.tagEn) : ''}
                  </div>
                  <h2 class="story-row__title">${escapeHtml(post.titleEn)}</h2>
                  <p class="story-row__excerpt">${escapeHtml(post.excerptEn || '')}</p>
                </div>
                <div class="story-row__suffix">
                  <span class="meta-kicker">${post.readTime} min</span>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderStaticBriefing(digests) {
  const leadDigest = digests[0];
  const gridDigests = digests.slice(1, 4);
  const restDigests = digests.slice(4);

  return `
    <div class="site-container-wide page-shell fade-in">
      <section class="home-section">
        <div class="section-head">
          <div>
            <p class="section-label">AI Briefing</p>
            <h1 class="section-head__title">Daily issues</h1>
            <p class="section-head__copy">${digests.length} briefings grouped by topic and signal.</p>
          </div>
        </div>

        ${leadDigest ? `
          <a href="${escapeAttr(safeLink(leadDigest.path || `/blog/${leadDigest.slug}`))}" class="feature-card feature-card--lead">
            <p class="section-label">Latest Issue</p>
            <div class="briefing-card__meta">
              <span>${formatDisplayDate(leadDigest.date)}</span>
              ${leadDigest.itemCount ? `<span>${leadDigest.itemCount} items</span>` : ''}
            </div>
            <h2 class="feature-card__title">${escapeHtml(leadDigest.titleEn)}</h2>
            ${leadDigest.excerptEn ? `<p class="feature-card__excerpt">${escapeHtml(stripMarkdown(leadDigest.excerptEn || ''))}</p>` : ''}
            <div class="briefing-card__themes">${renderBriefingChips(leadDigest.themes || [], 3)}</div>
          </a>
        ` : ''}
      </section>

      <section class="home-section">
        <div class="briefing-grid">
          ${gridDigests.map((digest) => `
            <a href="${escapeAttr(safeLink(digest.path || `/blog/${digest.slug}`))}" class="briefing-card">
              <div class="briefing-card__meta">
                <span>${formatDisplayDate(digest.date)}</span>
                ${digest.itemCount ? `<span>${digest.itemCount} items</span>` : ''}
              </div>
              <h2 class="briefing-card__title">${escapeHtml(digest.titleEn)}</h2>
              ${digest.excerptEn ? `<p class="briefing-card__excerpt">${escapeHtml(stripMarkdown(digest.excerptEn))}</p>` : ''}
              <div class="briefing-card__themes">${renderBriefingChips(digest.themes || [], 2)}</div>
            </a>
          `).join('')}
        </div>

        <div class="story-list" style="margin-top: 1rem;">
          ${restDigests.map((digest) => `
            <a href="${escapeAttr(safeLink(digest.path || `/blog/${digest.slug}`))}" class="story-row">
              <div class="story-row__date">${new Date(digest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div class="story-row__body">
                <div class="story-row__meta">
                  <span class="meta-kicker">AI Daily</span>
                  ${digest.itemCount ? renderTagPill(`${digest.itemCount} items`) : ''}
                </div>
                <h2 class="story-row__title">${escapeHtml(digest.titleEn)}</h2>
                ${digest.excerptEn ? `<p class="story-row__excerpt">${escapeHtml(stripMarkdown(digest.excerptEn))}</p>` : ''}
              </div>
            </a>
          `).join('')}
        </div>
      </section>
    </div>
  `;
}

function renderStaticArticlePage(post, options = {}) {
  const isDigest = Boolean(options.isDigest);
  const route = options.route;
  const heroKicker = isDigest ? 'AI Briefing' : post.tagEn || 'Writing';
  const source = isDigest
    ? stripDigestSignature(stripRedundantLeadingMarkdownH1(post.contentEn || '', post.titleEn))
    : stripRedundantLeadingMarkdownH1(post.contentEn || '', post.titleEn);
  const articleHtml = enhanceArticleHtml(stripRedundantLeadingHtmlH1(marked.parse(source || ''), post.titleEn));
  const backHref = isDigest ? '/briefing' : '/blog';
  const backLabel = isDigest ? 'Back to AI Briefing' : 'Back to writing';
  const shareText = isDigest ? 'Share this issue on X' : 'Share on X';
  const shouldRenderHeroImage = Boolean(post.image) && !post.hideHero && !bodyContainsImage(post.contentEn || '', post.image);

  return `
    <div class="article-shell fade-in">
      <a href="${backHref}" class="detail-backlink">
        <span aria-hidden="true">&larr;</span>
        <span>${backLabel}</span>
      </a>

      <header class="article-header-v2">
        <div class="article-header-v2__meta">
          <span class="tag-pill">${escapeHtml(heroKicker)}</span>
          <time dateTime="${escapeAttr(route.publishedAt || '')}">${escapeHtml(formatDisplayDate(post.publishedAt))}</time>
          ${post.readTime ? `<span>${post.readTime} min read</span>` : ''}
          ${!isDigest && post.kind ? `<span>${escapeHtml(post.kind)}</span>` : ''}
        </div>
        <h1 class="article-header-v2__title">${escapeHtml(post.titleEn)}</h1>
        ${post.excerptEn ? `<p class="article-header-v2__lede">${escapeHtml(post.excerptEn)}</p>` : ''}
      </header>

      ${shouldRenderHeroImage ? `<div class="article-hero-img"><img src="${escapeAttr(post.image)}" alt="" loading="eager" decoding="async" /></div>` : ''}

      <div class="article-body">
        <article class="prose-blog">${articleHtml}</article>
      </div>

      <div class="article-body">
        <div class="article-cta">
          <h3 class="article-cta__title">Enjoyed this? Stay in the loop.</h3>
          <p class="article-cta__copy">Get daily AI briefings and deep dives delivered to your feed.</p>
          <div class="article-cta__actions">
            <a href="${escapeAttr(siteConfig.xProfileUrl)}" target="_blank" rel="noreferrer" class="button-link">Follow on X</a>
            <a href="${SITE_URL}/feed.xml" target="_blank" rel="noreferrer" class="button-link--ghost">Subscribe via RSS</a>
          </div>
        </div>
      </div>

      <div class="article-footer">
        <a href="${backHref}" class="button-link--ghost">${backLabel}</a>
        <a href="https://x.com/intent/tweet?text=${encodeURIComponent(post.titleEn)}&url=${encodeURIComponent(route.url)}&via=GuangtaoS29545" target="_blank" rel="noopener noreferrer" class="x-cta">${shareText}</a>
      </div>
    </div>
  `;
}

function buildJsonLd(post, route, section) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titleEn,
    description: truncateText(post.excerptEn || post.contentEn, 200),
    datePublished: route.publishedAt,
    author: { '@type': 'Person', name: 'Thomas', url: SITE_URL, sameAs: ['https://x.com/GuangtaoS29545', 'https://github.com/shangguangtao567-thomas'] },
    publisher: { '@type': 'Person', name: 'Thomas', url: SITE_URL },
    mainEntityOfPage: { '@type': 'WebPage', '@id': route.url },
    url: route.url,
    keywords: (post.keywords || []).join(', '),
    articleSection: section,
    wordCount: post.contentEn ? post.contentEn.split(/\s+/).length : 0,
  };
  if (post.image) {
    schema.image = post.image.startsWith('/') ? `${SITE_URL}${post.image}` : post.image;
  }
  return JSON.stringify(schema);
}

async function main() {
  ensureDistExists();
  const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');

  const allPosts = loadJson(POSTS_FILE, []);
  const posts = loadJson(POSTS_INDEX_FILE, []).filter((post) => !post.slug.startsWith('ai-daily-'));
  const digests = loadJson(DIGESTS_FILE, []);
  const allPostsBySlug = new Map(allPosts.map((post) => [post.slug, post]));

  const baseRoute = {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: routeUrl(),
  };

  writeRouteHtml(template, '/', baseRoute, renderStaticHome({ posts, digests }));
  writeRouteHtml(template, 'blog', { ...baseRoute, title: `Writing · ${siteConfig.siteName}`, url: routeUrl('blog') }, renderStaticBlog(posts));

  const briefingRoute = { ...baseRoute, title: `AI Briefing · ${siteConfig.siteName}`, url: routeUrl('briefing') };
  const briefingHtml = renderStaticBriefing(digests);
  writeRouteHtml(template, 'briefing', briefingRoute, briefingHtml);
  writeRouteHtml(template, 'tech', briefingRoute, briefingHtml);

  for (const post of allPosts.filter((item) => !item.slug.startsWith('ai-daily-'))) {
    const articleRoute = {
      title: post.titleEn,
      description: truncateText(post.excerptEn || post.contentEn, 155),
      url: routeUrl(`blog/${post.slug}`),
      type: 'article',
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      image: post.image,
      keywords: post.keywords || [],
      jsonLd: buildJsonLd(post, { url: routeUrl(`blog/${post.slug}`), publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined }, post.tagEn || 'Writing'),
    };

    writeRouteHtml(template, `blog/${post.slug}`, articleRoute, renderStaticArticlePage(allPostsBySlug.get(post.slug) || post, { route: articleRoute }));
  }

  for (const digest of digests) {
    const post = allPostsBySlug.get(digest.slug);
    if (!post) continue;

    const digestRoute = {
      title: post.titleEn,
      description: truncateText(digest.excerptEn || post.excerptEn || post.contentEn, 155),
      url: routeUrl(`blog/${post.slug}`),
      type: 'article',
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      keywords: ['AI Daily', 'AI briefing', ...(digest.themes || []).map((theme) => theme.themeEn).filter(Boolean)],
      jsonLd: buildJsonLd(post, { url: routeUrl(`blog/${post.slug}`), publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined }, 'AI Briefing'),
    };

    writeRouteHtml(template, `blog/${post.slug}`, digestRoute, renderStaticArticlePage(post, { isDigest: true, digest, route: digestRoute }));
  }

  const feedPosts = allPosts.filter((item) => !item.slug.startsWith('ai-daily-'));
  const feedItems = feedPosts.map((post) => {
    const url = routeUrl(`blog/${post.slug}`);
    const content = marked.parse(stripRedundantLeadingMarkdownH1(post.contentEn || '', post.titleEn));
    return `
      <item>
        <title>${escapeXml(post.titleEn)}</title>
        <link>${url}</link>
        <guid>${url}</guid>
        <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
        <description>${escapeXml(truncateText(post.excerptEn || stripMarkdown(post.contentEn || ''), 500))}</description>
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

  const sitemapEntries = [
    { loc: routeUrl('briefing'), lastmod: new Date().toISOString() },
    { loc: routeUrl('blog'), lastmod: new Date().toISOString() },
    { loc: routeUrl(), lastmod: new Date().toISOString() },
    ...posts.map((post) => ({ loc: routeUrl(`blog/${post.slug}`), lastmod: new Date(post.publishedAt).toISOString() })),
    ...digests.map((digest) => ({ loc: routeUrl(`blog/${digest.slug}`), lastmod: new Date(digest.date).toISOString() })),
  ];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemapEntries.map((entry) => `
    <url>
      <loc>${entry.loc}</loc>
      <lastmod>${entry.lastmod}</lastmod>
    </url>
  `).join('')}
</urlset>`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);

  write404Page();
  writeCname();
  fs.copyFileSync(path.join(ROOT, 'public', 'robots.txt'), path.join(DIST_DIR, 'robots.txt'));

  console.log('✓ Static routes: prerendered redesigned pages, feed.xml, sitemap.xml, robots.txt, CNAME, and 404.html');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
