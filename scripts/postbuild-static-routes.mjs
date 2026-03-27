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
  return normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft);
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
  const featuredPosts = posts.slice(1, 4);
  const latestDigests = digests.slice(0, 3);

  return `
    <div class="site-container-wide page-shell page-shell--home fade-in">
      <section class="home-hero">
        <div class="hero-panel">
          <p class="eyebrow">Thomas</p>
          <h1 class="hero-panel__title"><span class="text-gradient">AI, open source,</span> and agent-era engineering.</h1>
          <p class="hero-panel__copy">
            Deep dives, daily briefings, and honest analysis on what is actually shipping in AI &mdash; not what is being announced.
          </p>
          <div class="hero-panel__actions">
            <a href="/blog" class="button-link">Read the Writing</a>
            <a href="/briefing" class="button-link--ghost">AI Briefing</a>
            <a href="${escapeAttr(siteConfig.xProfileUrl)}" target="_blank" rel="noreferrer" class="x-cta">Follow on X</a>
          </div>
        </div>

        ${heroPost ? `
          <a href="/blog/${heroPost.slug}" class="feature-card feature-card--hero">
            ${heroPost.image ? `<img src="${escapeAttr(heroPost.image)}" alt="" class="feature-card__image" loading="lazy" />` : ''}
            <div>
              <p class="section-label">Latest</p>
              <div class="feature-card__meta">
                <span>${formatDisplayDate(heroPost.publishedAt)}</span>
                <span>${heroPost.readTime} min read</span>
                ${heroPost.tagEn ? renderTagPill(heroPost.tagEn) : ''}
              </div>
              <h2 class="feature-card__title">${escapeHtml(heroPost.titleEn)}</h2>
              <p class="feature-card__excerpt">${escapeHtml(heroPost.excerptEn || '')}</p>
            </div>
            <div class="feature-card__footer">
              <span class="button-link--ghost">Read article &rarr;</span>
            </div>
          </a>
        ` : ''}
      </section>

      <section class="home-section">
        <div class="section-head">
          <div>
            <p class="section-label">Writing</p>
            <h2 class="section-head__title">Latest writing</h2>
            <p class="section-head__copy">${posts.length} essays, reviews, and explainers.</p>
          </div>
          <a href="/blog" class="section-head__link">All writing</a>
        </div>

        <div class="story-grid">
          ${featuredPosts.map((post) => `
            <a href="/blog/${post.slug}" class="story-card">
              <div class="story-row__meta">
                <span>${formatShortDate(post.publishedAt)}</span>
                ${post.tagEn ? renderTagPill(post.tagEn) : ''}
              </div>
              <h3 class="story-card__title">${escapeHtml(post.titleEn)}</h3>
              <p class="story-card__excerpt">${escapeHtml(post.excerptEn || '')}</p>
              <div class="story-card__footer">
                <span class="meta-kicker">${post.readTime} min read</span>
              </div>
            </a>
          `).join('')}
        </div>

      </section>

      <section class="home-section">
        <div class="section-head">
          <div>
            <p class="section-label">AI Briefing</p>
            <h2 class="section-head__title">Recent briefings</h2>
            <p class="section-head__copy">${digests.length} daily issues, grouped by theme and signal.</p>
          </div>
          <a href="/briefing" class="section-head__link">Briefing archive</a>
        </div>

        <div class="briefing-grid">
          ${latestDigests.map((digest) => `
            <a href="${escapeAttr(safeLink(digest.path || `/blog/${digest.slug}`))}" class="briefing-card">
              <div class="briefing-card__meta">
                <span>${formatDisplayDate(digest.date)}</span>
                ${digest.itemCount ? `<span>${digest.itemCount} items</span>` : ''}
              </div>
              <h3 class="briefing-card__title">${escapeHtml(digest.titleEn)}</h3>
              ${digest.excerptEn ? `<p class="briefing-card__excerpt">${escapeHtml(digest.excerptEn)}</p>` : ''}
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
            ${leadDigest.excerptEn ? `<p class="feature-card__excerpt">${escapeHtml(leadDigest.excerptEn || '')}</p>` : ''}
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
              ${digest.excerptEn ? `<p class="briefing-card__excerpt">${escapeHtml(digest.excerptEn)}</p>` : ''}
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
                ${digest.excerptEn ? `<p class="story-row__excerpt">${escapeHtml(digest.excerptEn)}</p>` : ''}
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
  const articleHtml = stripRedundantLeadingHtmlH1(marked.parse(source || ''), post.titleEn);
  const backHref = isDigest ? '/briefing' : '/blog';
  const backLabel = isDigest ? 'Back to AI Briefing' : 'Back to writing';
  const shareText = isDigest ? 'Share this issue on X' : 'Share on X';

  return `
    <div class="site-container detail-shell fade-in">
      <a href="${backHref}" class="detail-backlink">
        <span aria-hidden="true">←</span>
        <span>${backLabel}</span>
      </a>

      <header class="detail-hero detail-hero--reading${isDigest ? ' detail-hero--digest' : ''}">
        ${post.image ? `<img src="${escapeAttr(post.image)}" alt="" class="detail-hero__image" loading="eager" />` : ''}
        <span class="tag-pill">${escapeHtml(heroKicker)}</span>
        <div class="detail-hero__meta">
          <time dateTime="${escapeAttr(route.publishedAt || '')}">${escapeHtml(formatDisplayDate(post.publishedAt))}</time>
          ${post.readTime ? `<span>${post.readTime} min read</span>` : ''}
          ${!isDigest && post.kind ? `<span>${escapeHtml(post.kind)}</span>` : ''}
        </div>
        <h1 class="detail-hero__title detail-hero__title--reading">${escapeHtml(post.titleEn)}</h1>
        ${post.excerptEn ? `<div class="tldr-box"><span class="tldr-box__label">TL;DR</span><p class="tldr-box__content">${escapeHtml(post.excerptEn)}</p></div>` : ''}
      </header>

      <div class="detail-reading">
        <article class="prose-blog detail-content">${articleHtml}</article>
      </div>

      <div class="detail-reading">
        <div class="article-cta">
          <h3 class="article-cta__title">Enjoyed this? Stay in the loop.</h3>
          <p class="article-cta__copy">Get daily AI briefings and deep dives delivered to your feed.</p>
          <div class="article-cta__actions">
            <a href="${escapeAttr(siteConfig.xProfileUrl)}" target="_blank" rel="noreferrer" class="button-link">Follow on X</a>
            <a href="${SITE_URL}/feed.xml" target="_blank" rel="noreferrer" class="button-link--ghost">Subscribe via RSS</a>
          </div>
        </div>
      </div>

      <div class="detail-footer">
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
      title: `${post.titleEn} · Thomas`,
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
      title: `${post.titleEn} · Thomas`,
      description: truncateText(digest.excerptEn || post.excerptEn || post.contentEn, 155),
      url: routeUrl(`blog/${post.slug}`),
      type: 'article',
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
      keywords: ['AI Daily', 'AI briefing', ...(digest.themes || []).map((theme) => theme.themeEn).filter(Boolean)],
      jsonLd: buildJsonLd(post, { url: routeUrl(`blog/${post.slug}`), publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined }, 'AI Briefing'),
    };

    writeRouteHtml(template, `blog/${post.slug}`, digestRoute, renderStaticArticlePage(post, { isDigest: true, digest, route: digestRoute }));
  }

  const feedItems = posts.map((post) => {
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
