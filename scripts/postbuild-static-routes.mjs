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
const DIGEST_DETAILS_FILE = path.join(DATA_DIR, 'ai-digest-details.json');
const TECH_NEWS_FILE = path.join(DATA_DIR, 'tech-news.json');
const X_DRAFTS_FILE = path.join(DATA_DIR, 'x-drafts.json');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');

const siteConfig = loadSiteConfig();
const SITE_URL = (process.env.SITE_URL || siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
const DEFAULT_TITLE = `${siteConfig.siteName} · AI · Open Source · Vibe Coding`;
const DEFAULT_DESCRIPTION = 'Daily AI briefings, X-ready draft packs, and durable notes about agent infrastructure, coding workflows, and open source tools.';

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

function escapeJsonForHtml(value) {
  return JSON.stringify(value, null, 2).replace(/</g, '\\u003c');
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

function toAbsoluteUrl(url) {
  if (!url) return '';
  return new URL(url, `${SITE_URL}/`).toString();
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
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
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

  if (route.section) {
    html = upsertMeta(html, 'property', 'article:section', route.section);
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
  const pathname = new URL(`${SITE_URL}/`).pathname;
  const pathSegmentsToKeep = pathname.split('/').filter(Boolean).length;
  const file = path.join(DIST_DIR, '404.html');
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting...</title>
    <meta name="robots" content="noindex" />
    <script>
      const pathSegmentsToKeep = ${pathSegmentsToKeep};
      const locationRef = window.location;
      locationRef.replace(
        locationRef.protocol +
          '//' +
          locationRef.hostname +
          (locationRef.port ? ':' + locationRef.port : '') +
          locationRef.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') +
          '/?/' +
          locationRef.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
          (locationRef.search ? '&' + locationRef.search.slice(1).replace(/&/g, '~and~') : '') +
          locationRef.hash
      );
    </script>
  </head>
  <body></body>
</html>
`;
  fs.writeFileSync(file, html);
}

function writeCname() {
  const hostname = new URL(`${SITE_URL}/`).hostname;
  if (!hostname.endsWith('github.io')) {
    fs.writeFileSync(path.join(DIST_DIR, 'CNAME'), `${hostname}\n`);
  }
}

function renderGrowthActionsHtml(context, compact = false) {
  const followClass = compact
    ? 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full bg-foreground text-background text-xs font-ui font-medium hover:opacity-90 transition-opacity'
    : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-ui font-medium hover:opacity-90 transition-opacity';
  const secondaryClass = compact
    ? 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full border border-border text-xs font-ui text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors'
    : 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-ui text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors';
  const subscribeUrl = siteConfig.buttondownUrl || `${SITE_URL}/feed.xml`;
  const subscribeLabel = siteConfig.buttondownUrl ? 'Subscribe' : 'Follow via RSS';

  return `
    <div class="flex flex-wrap items-center gap-3">
      <a href="${escapeAttr(siteConfig.xProfileUrl)}" target="_blank" rel="noreferrer" data-context="${escapeAttr(context)}" class="${followClass}" style="background: var(--foreground); color: var(--background); text-decoration: none;">Follow on X <span aria-hidden="true">↗</span></a>
      <a href="${escapeAttr(subscribeUrl)}" target="_blank" rel="noreferrer" data-context="${escapeAttr(context)}" class="${secondaryClass}" style="text-decoration: none;">${subscribeLabel} <span aria-hidden="true">↗</span></a>
    </div>
  `.trim();
}

function renderStaticHome({ posts, latestDigest, previewItems }) {
  const latestPosts = posts.slice(0, 4).map((post, index) => `
    <a href="${routeUrl(`blog/${post.slug}`)}" class="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150 w-full text-left" style="text-decoration: none;">
      <span class="text-[11px] font-mono text-muted-foreground w-5 flex-shrink-0 text-right" style="color: color-mix(in oklch, var(--muted-foreground) 50%, transparent);">${String(index + 1).padStart(2, '0')}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-foreground truncate font-ui">${escapeHtml(post.titleEn || post.titleZh || post.slug)}</p>
        <div class="flex items-center gap-2 mt-0.5">
          <span class="text-[10px] text-muted-foreground font-mono">${escapeHtml(formatDisplayDate(post.publishedAt || ''))}</span>
          <span class="text-[10px] text-muted-foreground font-ui">· ${escapeHtml(post.tagEn || post.tag || 'Tech')}</span>
        </div>
      </div>
    </a>
  `).join('\n');

  const previewCards = previewItems.map(item => `
    <div class="group flex flex-col gap-2 p-4 rounded-xl bg-card border border-border">
      <div class="flex items-start justify-between gap-2">
        <span class="text-[10px] font-medium px-2 py-0.5 rounded-md font-ui bg-secondary text-secondary-foreground" style="background: var(--secondary); color: var(--secondary-foreground);">${escapeHtml(item.tag || 'Tech')}</span>
        <span class="text-[11px] text-muted-foreground font-mono">${escapeHtml(item.publishedLabelEn || item.sourceName || item.source || '')}</span>
      </div>
      <p class="text-sm font-medium text-foreground leading-snug font-ui">${escapeHtml(item.titleEn || item.titleZh || '')}</p>
      <p class="text-xs text-muted-foreground font-ui">${escapeHtml(truncateText(item.deckEn || item.summaryEn || item.deckZh || item.summaryZh, 140))}</p>
    </div>
  `).join('\n');

  return `
<div class="min-h-screen">
  <div class="px-6 md:px-8 py-10 max-w-5xl mx-auto">
    <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 mb-14">
      <div class="flex flex-col gap-6">
        <div class="flex items-center gap-4">
          <div class="relative flex-shrink-0">
            <div class="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-border bg-card">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp" alt="Thomas mascot" class="w-full h-full object-cover" />
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background"></div>
          </div>
          <div>
            <h1 class="text-xl font-semibold text-foreground font-display">Thomas</h1>
            <p class="text-xs text-muted-foreground font-mono mt-0.5">@GuangtaoS29545</p>
          </div>
        </div>

        <div class="space-y-3">
          <p class="text-sm text-foreground/80 leading-relaxed font-ui" style="color: color-mix(in oklch, var(--foreground) 80%, transparent);">Tech enthusiast, turning ideas into reality with vibe coding. This is where I document my thoughts on AI, open source tools, and tech trends.</p>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-ui bg-secondary text-secondary-foreground border border-border">AI Explorer</span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-ui bg-secondary text-secondary-foreground border border-border">Vibe Coder</span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-ui bg-secondary text-secondary-foreground border border-border">Open Source</span>
        </div>

        <div class="grid grid-cols-3 gap-3 pt-1">
          <div class="text-center p-2.5 rounded-xl bg-card border border-border">
            <p class="text-lg font-bold text-foreground font-mono">${posts.length}</p>
            <p class="text-[10px] text-muted-foreground font-ui mt-0.5">Posts</p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-card border border-border">
            <p class="text-lg font-bold text-foreground font-mono">${latestDigest ? '1+' : '0'}</p>
            <p class="text-[10px] text-muted-foreground font-ui mt-0.5">Digests</p>
          </div>
          <div class="text-center p-2.5 rounded-xl bg-card border border-border">
            <p class="text-lg font-bold text-foreground font-mono">∞</p>
            <p class="text-[10px] text-muted-foreground font-ui mt-0.5">Curiosity</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">// LATEST POSTS</p>
            <h2 class="text-lg font-semibold text-foreground font-display">Recent Writing</h2>
          </div>
          <a href="${routeUrl('blog')}" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group" style="text-decoration: none;">All posts</a>
        </div>
        <div class="space-y-2">${latestPosts}</div>
      </div>
    </div>

    <div class="border-t border-border pt-10 space-y-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">// AI DAILY</p>
          <h2 class="text-lg font-semibold text-foreground font-display">Read the full digest first, then open sources</h2>
        </div>
        <a href="${routeUrl('tech')}" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group" style="text-decoration: none;">Open digest hub</a>
      </div>

      ${latestDigest ? `
        <a href="${routeUrl(latestDigest.path)}" class="block w-full text-left rounded-[24px] border border-border bg-card p-6 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
          <p class="text-[11px] font-mono text-muted-foreground mb-2">${escapeHtml(latestDigest.date)}</p>
          <h3 class="text-2xl font-display font-semibold text-foreground mb-3">${escapeHtml(latestDigest.titleEn || latestDigest.titleZh)}</h3>
          <p class="text-sm text-muted-foreground font-ui leading-relaxed mb-4 max-w-3xl">${escapeHtml(truncateText(latestDigest.issueSummaryEn || latestDigest.excerptEn || latestDigest.issueSummaryZh || latestDigest.excerptZh, 240))}</p>
          <div class="flex flex-wrap gap-2 text-xs font-ui text-muted-foreground mb-4">
            <span class="px-3 py-1.5 rounded-full border border-border bg-background/70">${latestDigest.itemCount} highlighted items</span>
            ${latestDigest.bodyCoverage ? `<span class="px-3 py-1.5 rounded-full border border-border bg-background/70">Full-body coverage ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}</span>` : ''}
          </div>
          <p class="text-xs font-ui text-foreground">→ Read full digest</p>
        </a>
      ` : ''}

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${previewCards}</div>
    </div>
  </div>
</div>
  `.trim();
}

function renderStaticBlogIndex(posts, topics) {
  const articleCards = posts
    .map((post, index) => `
      <a href="${routeUrl(`blog/${post.slug}`)}" class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
        <div class="flex items-start gap-4">
          <span class="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right text-muted-foreground">${String(index + 1).padStart(2, '0')}</span>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-3 mb-1">
              <h2 class="text-sm font-semibold text-foreground font-ui">${escapeHtml(post.titleEn || post.titleZh || post.slug)}</h2>
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-md font-ui bg-secondary text-secondary-foreground flex-shrink-0" style="background: var(--secondary); color: var(--secondary-foreground);">${escapeHtml(post.pillar || post.tagEn || post.tag)}</span>
            </div>
            <p class="text-xs text-muted-foreground font-ui mb-2">${escapeHtml(post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION)}</p>
            <div class="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
              <span>${escapeHtml(formatDisplayDate(post.publishedAt || ''))}</span>
              <span>${escapeHtml(String(post.readTime || ''))} min</span>
            </div>
          </div>
        </div>
      </a>
    `.trim())
    .join('\n');

  const topicLinks = topics.slice(0, 6).map(topic => `
    <a href="${routeUrl(`topic/${topic.slug}`)}" class="px-3 py-1.5 rounded-full border border-border text-xs font-ui text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-colors" style="text-decoration: none;">
      ${escapeHtml(topic.labelEn)} · ${topic.count}
    </a>
  `.trim()).join('\n');

  return `
<div class="min-h-screen">
  <div class="px-6 md:px-8 py-10 max-w-3xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground font-display mb-1.5">Blog</h1>
      <p class="text-sm text-muted-foreground font-ui">${posts.length} posts about AI, open source tools, and tech trends</p>
      <div class="mt-4">${renderGrowthActionsHtml('static_blog_index', true)}</div>
    </div>
    <div class="flex flex-wrap gap-2 mb-6">${topicLinks}</div>
    <div class="space-y-3">${articleCards}</div>
  </div>
</div>
  `.trim();
}

function renderStaticTechHub({ latestDigest, latestDraft, highlightItems, archiveDigests }) {
  const previewCards = highlightItems.map(item => `
    <div class="rounded-2xl border border-border bg-card p-5">
      <div class="flex items-center justify-between gap-3 mb-3">
        <span class="text-[10px] font-medium px-2 py-1 rounded-md font-ui bg-secondary text-secondary-foreground" style="background: var(--secondary); color: var(--secondary-foreground);">${escapeHtml(item.tag || 'Tech')}</span>
        <span class="text-[11px] font-mono text-muted-foreground">${escapeHtml(item.publishedLabelEn || item.publishedAt || '')}</span>
      </div>
      <h3 class="text-base font-semibold text-foreground leading-snug mb-2 font-ui">${escapeHtml(item.titleEn || item.titleZh || '')}</h3>
      <p class="text-sm text-muted-foreground leading-relaxed font-ui mb-3">${escapeHtml(truncateText(item.deckEn || item.summaryEn || item.deckZh || item.summaryZh, 150))}</p>
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-muted-foreground font-ui">${escapeHtml(truncateText(item.whyItMattersEn || item.whyItMattersZh || '', 70))}</p>
        <span class="text-xs text-foreground font-ui flex-shrink-0">→</span>
      </div>
    </div>
  `).join('\n');

  const archiveHtml = archiveDigests.map((digest, index) => `
    <a href="${routeUrl(digest.path)}" class="block w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
      <div class="flex flex-col md:flex-row md:items-start gap-4 md:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-[11px] font-mono text-muted-foreground">${String(index + 1).padStart(2, '0')}</span>
            <span class="text-[11px] font-mono text-muted-foreground">${escapeHtml(digest.date)}</span>
          </div>
          <h3 class="text-base font-semibold text-foreground font-ui mb-2">${escapeHtml(digest.titleEn || digest.titleZh || '')}</h3>
          <p class="text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(truncateText(digest.excerptEn || digest.excerptZh || '', 180))}</p>
        </div>
        <div class="md:text-right flex-shrink-0">
          <p class="text-xs text-muted-foreground font-mono mb-2">${digest.itemCount} items</p>
          <p class="text-xs text-foreground font-ui">→ Open digest</p>
        </div>
      </div>
    </a>
  `).join('\n');

  return `
<div class="min-h-screen">
  <div class="px-6 md:px-8 py-10 max-w-5xl mx-auto space-y-10">
    <section class="rounded-[28px] border border-border bg-card p-6 md:p-8">
      <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] font-mono mb-3">// AI DAILY SYSTEM</p>
      <div class="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
        <div>
          <h1 class="text-3xl md:text-4xl font-bold text-foreground font-display mb-4">On-site AI Daily Briefing</h1>
          <p class="text-sm md:text-base text-muted-foreground font-ui max-w-2xl leading-relaxed">This page gives you the day’s highest-signal cards first, then pushes the full explanation into the digest article. The growth system still runs underneath, but the front-end keeps only the reading surfaces that matter.</p>
          <div class="mt-5">${renderGrowthActionsHtml('static_tech_hub')}</div>
        </div>
        ${latestDigest ? `
          <a href="${routeUrl(latestDigest.path)}" class="block text-left rounded-2xl border border-border bg-background/60 p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
            <p class="text-[11px] font-mono text-muted-foreground mb-2">${escapeHtml(latestDigest.date)}</p>
            <h2 class="text-lg font-semibold text-foreground font-display mb-2">${escapeHtml(latestDigest.titleEn || latestDigest.titleZh || '')}</h2>
            <p class="text-sm text-muted-foreground font-ui leading-relaxed mb-3">${escapeHtml(truncateText(latestDigest.issueSummaryEn || latestDigest.excerptEn || latestDigest.issueSummaryZh || latestDigest.excerptZh, 180))}</p>
            <div class="flex flex-wrap gap-2 text-[11px] font-ui text-muted-foreground mb-3">
              <span class="px-2.5 py-1 rounded-full border border-border bg-card">${latestDigest.itemCount} highlighted items</span>
              ${latestDigest.bodyCoverage ? `<span class="px-2.5 py-1 rounded-full border border-border bg-card">Bodies ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}</span>` : ''}
            </div>
            <p class="text-xs font-ui text-foreground">→ Read latest issue</p>
          </a>
        ` : ''}
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-4">
        <div>
          <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">// TODAY PREVIEWS</p>
          <h2 class="text-xl font-semibold text-foreground font-display">Preview what happened, then open the full digest</h2>
        </div>
        ${latestDigest ? `<a href="${routeUrl(latestDigest.path)}" class="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors" style="text-decoration: none;">Open full digest</a>` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">${previewCards}</div>
    </section>

    ${latestDraft ? `
      <section class="rounded-[24px] border border-border bg-card p-5 md:p-6">
        <div class="flex items-start justify-between gap-4 mb-3">
          <div>
            <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">// TODAY'S X ANGLE</p>
            <h2 class="text-lg font-semibold text-foreground font-display">Prepared for distribution, but not stealing the page</h2>
          </div>
          ${latestDigest ? `<a href="${routeUrl(latestDigest.path)}" class="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors" style="text-decoration: none;">Back to this issue</a>` : ''}
        </div>
        <p class="text-sm text-foreground font-ui leading-relaxed mb-3">${escapeHtml(latestDraft.angleEn || latestDraft.angleZh || '')}</p>
        <div class="grid gap-2 md:grid-cols-2">
          ${(latestDraft.hooksEn || latestDraft.hooksZh || []).slice(0, 2).map(hook => `
            <div class="rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(truncateText(hook, 140))}</div>
          `).join('\n')}
        </div>
      </section>
    ` : ''}

    <section>
      <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-3">// ARCHIVE</p>
      <div class="space-y-3">${archiveHtml}</div>
    </section>
  </div>
</div>
  `.trim();
}

function renderStaticTopicPage(topic, posts) {
  const cards = posts.map((post, index) => `
    <a href="${routeUrl(`blog/${post.slug}`)}" class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
      <div class="flex items-start gap-4">
        <span class="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right text-muted-foreground">${String(index + 1).padStart(2, '0')}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-2 text-[11px] text-muted-foreground font-mono">
            <span>${escapeHtml(formatDisplayDate(post.publishedAt || ''))}</span>
            <span>${post.readTime} min</span>
          </div>
          <h2 class="text-lg font-display text-foreground mb-2">${escapeHtml(post.titleEn || post.titleZh || post.slug)}</h2>
          <p class="text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION)}</p>
        </div>
      </div>
    </a>
  `).join('\n');

  return `
<div class="min-h-screen">
  <div class="px-6 md:px-8 py-10 max-w-4xl mx-auto">
    <a href="${routeUrl('blog')}" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-6 group" style="text-decoration: none;">
      <span>←</span>
      <span>Back to blog</span>
    </a>
    <section class="rounded-[28px] border border-border bg-card p-6 md:p-8 mb-8">
      <p class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-3">// TOPIC ARCHIVE</p>
      <h1 class="text-3xl md:text-4xl font-display text-foreground leading-tight mb-3">${escapeHtml(topic.labelEn)}</h1>
      <p class="text-sm md:text-base text-muted-foreground font-ui leading-relaxed max-w-3xl">This topic archive groups ${topic.count} pieces so readers arriving from X or search can keep following the same line of thought.</p>
      <div class="mt-5">${renderGrowthActionsHtml(`static_topic_${topic.slug}`, true)}</div>
    </section>
    <section class="space-y-3">${cards}</section>
  </div>
</div>
  `.trim();
}

function buildRelatedPosts(post, nonDigestPosts) {
  return nonDigestPosts
    .filter(item => item.slug !== post.slug)
    .map(item => {
      let score = 0;
      if (item.topicSlug && post.topicSlug && item.topicSlug === post.topicSlug) score += 3;
      if (item.pillar && post.pillar && item.pillar === post.pillar) score += 2;
      if (item.tagEn === post.tagEn) score += 1;
      return { item, score };
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.item.publishedAt.localeCompare(a.item.publishedAt))
    .slice(0, 3)
    .map(entry => entry.item);
}

function renderStaticDigest(post, detail, archive, xDraft) {
  const title = post.seoTitleEn || post.titleEn || post.titleZh || post.slug;
  const description = detail?.issueSummaryEn || post.excerptEn || detail?.issueSummaryZh || post.excerptZh || DEFAULT_DESCRIPTION;
  const articleUrl = routeUrl(`blog/${post.slug}`);
  const publishedAt = post.publishedAt || detail?.date || '';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    articleSection: 'AI Daily',
    inLanguage: 'en',
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    author: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: SITE_URL,
    },
  };

  const itemsHtml = (detail?.items || []).map(item => `
    <article class="rounded-[28px] border border-border bg-card p-6 md:p-8 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div class="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-[0.12em]">
          <span>#${String(item.rank || 0).padStart(2, '0')}</span>
          ${item.sectionLabelEn ? `<span>•</span><span>${escapeHtml(item.sectionLabelEn)}</span>` : ''}
          ${item.kickerEn ? `<span>•</span><span>${escapeHtml(item.kickerEn)}</span>` : ''}
        </div>
        <div class="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-ui">
          <span>${escapeHtml(item.sourceName || item.source || '')}</span>
          ${item.publishedLabelEn ? `<span>· ${escapeHtml(item.publishedLabelEn)}</span>` : ''}
        </div>
      </div>
      <h2 class="text-2xl md:text-[1.9rem] leading-tight font-display text-foreground mb-3">${escapeHtml(item.briefTitleEn || item.titleEn || item.titleZh || '')}</h2>
      <p class="text-base leading-relaxed text-foreground/90 font-ui mb-5">${escapeHtml(item.summaryEn || item.summaryZh || '')}</p>
      <div class="space-y-4 mb-5">
        ${(item.narrativeEn || item.narrativeZh || []).map(line => `<p class="text-[15px] md:text-base leading-8 text-foreground font-ui">${escapeHtml(line)}</p>`).join('\n')}
      </div>
      <div class="pt-4 border-t border-border flex flex-wrap gap-x-4 gap-y-2 text-sm font-ui text-muted-foreground">
        ${(item.relatedLinks || []).map(link => `
          <a href="${escapeAttr(link.url)}" target="_blank" rel="noreferrer" class="underline underline-offset-4 hover:text-foreground transition-colors">${escapeHtml(link.labelEn || link.labelZh || link.url)}</a>
        `).join('\n')}
      </div>
    </article>
  `).join('\n');

  const archiveCards = archive
    .filter(item => item.slug !== post.slug)
    .slice(0, 5)
    .map(item => `
      <a href="${routeUrl(item.path)}" class="block w-full text-left pb-3 border-b border-border last:border-b-0 last:pb-0" style="text-decoration: none;">
        <p class="text-[11px] font-mono text-muted-foreground mb-1">${escapeHtml(item.date)}</p>
        <p class="text-sm font-medium text-foreground font-ui mb-1">${escapeHtml(item.titleEn || item.titleZh || '')}</p>
        <p class="text-xs leading-relaxed text-muted-foreground font-ui">${escapeHtml(truncateText(item.excerptEn || item.excerptZh || '', 88))}</p>
      </a>
    `).join('\n');

  const bodyHtml = `
<div class="min-h-screen">
  <div class="max-w-6xl mx-auto px-6 md:px-8 pt-8 pb-20">
    <a href="${routeUrl('tech')}" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-6 group" style="text-decoration: none;">
      <span>←</span>
      <span>Back to digest hub</span>
    </a>

    <section class="rounded-[32px] border border-border bg-card p-6 md:p-8 mb-8 overflow-hidden relative">
      <div class="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(99,102,241,0.9),rgba(16,185,129,0.8),rgba(251,191,36,0.75))]"></div>
      <div class="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <div>
          <p class="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">// AI DAILY BRIEFING</p>
          <h1 class="text-3xl md:text-5xl leading-tight font-display text-foreground mb-4">${escapeHtml(title)}</h1>
          <p class="text-base md:text-lg leading-relaxed text-muted-foreground font-ui max-w-3xl mb-5">${escapeHtml(description)}</p>
          <div class="flex flex-wrap gap-2 text-xs font-ui text-muted-foreground">
            <span class="px-3 py-1.5 rounded-full border border-border bg-background/70">${escapeHtml(formatDisplayDate(publishedAt))}</span>
            <span class="px-3 py-1.5 rounded-full border border-border bg-background/70">${detail?.itemCount || 0} highlighted items</span>
            ${detail?.bodyCoverage ? `<span class="px-3 py-1.5 rounded-full border border-border bg-background/70">Full articles added ${detail.bodyCoverage.succeeded}/${detail.bodyCoverage.targeted || detail.itemCount}</span>` : ''}
          </div>
        </div>
        <div class="rounded-[24px] border border-border bg-background/70 p-5">
          <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">How to read this issue</p>
          <p class="text-sm leading-relaxed text-foreground font-ui mb-4">Start with the lead, then follow the threads downward. Each entry is written to answer three things quickly: what happened, why it matters, and how it connects to the recent arc.</p>
          ${(detail?.themes || []).length ? `
            <div class="mb-5">
              <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">Main threads</p>
              <div class="flex flex-wrap gap-2">
                ${(detail.themes || []).slice(0, 4).map(theme => `
                  <span class="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-ui text-foreground">${escapeHtml(theme.themeEn)} · ${theme.count}</span>
                `).join('\n')}
              </div>
            </div>
          ` : ''}
          <div>${renderGrowthActionsHtml(`static_digest_${post.slug}`)}</div>
        </div>
      </div>
    </section>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
      <main class="space-y-5">${itemsHtml || `<article class="rounded-[28px] border border-border bg-card p-6 md:p-8"><div class="prose-article">${marked.parse(post.contentEn || post.contentZh || '')}</div></article>`}</main>
      <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
        ${xDraft ? `
          <section class="rounded-[24px] border border-border bg-card p-5">
            <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">Today's X draft</p>
            <p class="text-sm leading-relaxed text-foreground font-ui mb-3">${escapeHtml(xDraft.angleEn || xDraft.angleZh || '')}</p>
            <p class="text-xs leading-relaxed text-muted-foreground font-ui">${escapeHtml(truncateText(xDraft.shortPostEn || xDraft.shortPostZh || '', 180))}</p>
          </section>
        ` : ''}
        <section class="rounded-[24px] border border-border bg-card p-5">
          <p class="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">Archive</p>
          <div class="space-y-3">${archiveCards}</div>
        </section>
      </aside>
    </div>
  </div>
</div>
  `.trim();

  return {
    route: {
      title: `${title} · ${siteConfig.siteName}`,
      description,
      url: articleUrl,
      type: 'article',
      publishedAt,
      section: 'AI Daily',
      jsonLd: escapeJsonForHtml(jsonLd),
    },
    bodyHtml,
  };
}

function renderStaticArticle(post, nonDigestPosts) {
  const title = post.seoTitleEn || post.titleEn || post.seoTitleZh || post.titleZh || post.slug;
  const description = post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION;
  const articleTag = post.pillar || post.tagEn || post.tag || 'Tech';
  const articleUrl = routeUrl(`blog/${post.slug}`);
  const imageUrl = toAbsoluteUrl(post.image || '');
  const publishedAt = post.publishedAt || '';
  const contentMarkdown = post.contentEn || post.contentZh || '';
  const contentHtml = contentMarkdown ? marked.parse(contentMarkdown) : '<p>Article content coming soon.</p>';

  const currentIndex = nonDigestPosts.findIndex(item => item.slug === post.slug);
  const previousPost = currentIndex >= 0 ? nonDigestPosts[currentIndex + 1] : undefined;
  const nextPost = currentIndex > 0 ? nonDigestPosts[currentIndex - 1] : undefined;
  const relatedPosts = buildRelatedPosts(post, nonDigestPosts);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    articleSection: articleTag,
    inLanguage: post.contentEn ? 'en' : 'zh-CN',
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    keywords: post.keywords || [],
    author: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: SITE_URL,
    },
    ...(imageUrl ? { image: [imageUrl] } : {}),
  };

  const navCards = [
    nextPost ? `
      <a href="${routeUrl(`blog/${nextPost.slug}`)}" class="block text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
        <p class="text-[11px] font-mono text-muted-foreground mb-2">Newer post</p>
        <p class="text-lg font-display text-foreground mb-2">${escapeHtml(nextPost.titleEn || nextPost.titleZh || nextPost.slug)}</p>
        <p class="text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(truncateText(nextPost.excerptEn || nextPost.excerptZh || DEFAULT_DESCRIPTION, 150))}</p>
      </a>
    `.trim() : '',
    previousPost ? `
      <a href="${routeUrl(`blog/${previousPost.slug}`)}" class="block text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
        <p class="text-[11px] font-mono text-muted-foreground mb-2">Older post</p>
        <p class="text-lg font-display text-foreground mb-2">${escapeHtml(previousPost.titleEn || previousPost.titleZh || previousPost.slug)}</p>
        <p class="text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(truncateText(previousPost.excerptEn || previousPost.excerptZh || DEFAULT_DESCRIPTION, 150))}</p>
      </a>
    `.trim() : '',
  ].filter(Boolean).join('\n');

  const relatedCards = relatedPosts
    .map(item => `
      <a href="${routeUrl(`blog/${item.slug}`)}" class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all" style="text-decoration: none;">
        <p class="text-lg font-display text-foreground mb-2">${escapeHtml(item.titleEn || item.titleZh || item.slug)}</p>
        <p class="text-sm text-muted-foreground font-ui leading-relaxed">${escapeHtml(truncateText(item.excerptEn || item.excerptZh || DEFAULT_DESCRIPTION, 150))}</p>
      </a>
    `.trim())
    .join('\n');

  const bodyHtml = `
<div class="min-h-screen">
  <article class="max-w-2xl mx-auto px-6 md:px-8 pt-10 pb-20">
    <a href="${routeUrl('blog')}" class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-8 group" style="text-decoration: none;">
      <span>←</span>
      <span>Back to Blog</span>
    </a>

    ${imageUrl ? `<div class="rounded-2xl overflow-hidden aspect-[16/7] mb-10"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" class="w-full h-full object-cover" /></div>` : ''}

    <div class="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground font-ui">
      <span>${escapeHtml(formatDisplayDate(publishedAt))}</span>
      <span>${escapeHtml(String(post.readTime || ''))} min read</span>
      ${articleTag ? (
        post.topicSlug
          ? `<a href="${routeUrl(`topic/${post.topicSlug}`)}" class="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium" style="background: var(--secondary); color: var(--secondary-foreground); text-decoration: none;">${escapeHtml(articleTag)}</a>`
          : `<span class="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium" style="background: var(--secondary); color: var(--secondary-foreground);">${escapeHtml(articleTag)}</span>`
      ) : ''}
    </div>

    <h1 class="text-3xl md:text-4xl font-display text-foreground leading-tight mb-4">${escapeHtml(title)}</h1>
    <p class="text-base md:text-lg text-muted-foreground font-ui leading-relaxed mb-6">${escapeHtml(description)}</p>
    <div class="mb-8">${renderGrowthActionsHtml(`static_post_${post.slug}`, true)}</div>

    <div class="prose-article">${contentHtml}</div>

    ${navCards ? `
      <section class="mt-16 pt-8 border-t border-border">
        <p class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-4">// CONTINUE READING</p>
        <div class="grid gap-4 md:grid-cols-2">${navCards}</div>
      </section>
    ` : ''}

    ${relatedCards ? `
      <section class="mt-12 pt-8 border-t border-border">
        <p class="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-4">// RELATED POSTS</p>
        <div class="space-y-3">${relatedCards}</div>
      </section>
    ` : ''}

    <div class="mt-16 pt-8 border-t border-border">
      <a href="${routeUrl('blog')}" class="inline-flex items-center gap-2 text-sm font-ui text-muted-foreground hover:text-foreground transition-colors" style="text-decoration: none;">
        <span>←</span>
        <span>Back to all posts</span>
      </a>
    </div>
  </article>

  <footer class="border-t border-border py-10 text-center">
    <p class="text-xs text-muted-foreground font-ui">© 2026 Thomas. All rights reserved.</p>
  </footer>
</div>
  `.trim();

  return {
    route: {
      title: `${title} · ${siteConfig.siteName}`,
      description,
      url: articleUrl,
      type: 'article',
      image: imageUrl,
      publishedAt,
      section: articleTag,
      keywords: post.keywords || [],
      jsonLd: escapeJsonForHtml(jsonLd),
    },
    bodyHtml,
  };
}

function writeSitemap(posts, topics) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { url: routeUrl(''), lastmod: today },
    { url: routeUrl('blog'), lastmod: posts[0]?.publishedAt || today },
    { url: routeUrl('tech'), lastmod: posts[0]?.publishedAt || today },
    ...topics.map(topic => ({
      url: routeUrl(`topic/${topic.slug}`),
      lastmod: posts.find(post => post.topicSlug === topic.slug)?.publishedAt || today,
    })),
    ...posts.map(post => ({
      url: routeUrl(`blog/${post.slug}`),
      lastmod: post.publishedAt || today,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ url, lastmod }) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml);
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
}

function writeFeed(posts) {
  const items = posts
    .slice(0, 20)
    .map(post => {
      const title = escapeXml(post.titleEn || post.titleZh || post.slug);
      const description = escapeXml(post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION);
      const link = escapeXml(routeUrl(`blog/${post.slug}`));
      const pubDate = new Date(post.publishedAt || Date.now()).toUTCString();
      return `  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid>${link}</guid>
    <pubDate>${escapeXml(pubDate)}</pubDate>
    <description>${description}</description>
  </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(siteConfig.siteName)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(DEFAULT_DESCRIPTION)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'feed.xml'), xml);
}

ensureDistExists();

const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
const postsIndex = loadJson(POSTS_INDEX_FILE, []);
const posts = loadJson(POSTS_FILE, []);
const digests = loadJson(DIGESTS_FILE, []);
const digestDetails = loadJson(DIGEST_DETAILS_FILE, []);
const techNews = loadJson(TECH_NEWS_FILE, []);
const xDrafts = loadJson(X_DRAFTS_FILE, []);
const topics = loadJson(TOPICS_FILE, []);
const nonDigestPosts = posts.filter(post => !post.slug.startsWith('ai-daily-'));
const latestDigest = digests[0];
const latestDraft = xDrafts[0];

writeRouteHtml(
  template,
  '',
  {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: routeUrl(''),
    jsonLd: escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteConfig.siteName,
      url: SITE_URL,
      description: DEFAULT_DESCRIPTION,
      author: {
        '@type': 'Person',
        name: siteConfig.authorName,
      },
    }),
  },
  renderStaticHome({
    posts: nonDigestPosts,
    latestDigest,
    previewItems: techNews.slice(0, 3),
  })
);

writeRouteHtml(
  template,
  'blog',
  {
    title: `Blog · ${siteConfig.siteName}`,
    description: 'Long-form notes on AI, agent infrastructure, open source tools, and tech trends.',
    url: routeUrl('blog'),
    jsonLd: escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Blog',
      url: routeUrl('blog'),
      description: 'Long-form notes on AI, agent infrastructure, open source tools, and tech trends.',
    }),
  },
  renderStaticBlogIndex(nonDigestPosts, topics)
);

writeRouteHtml(
  template,
  'tech',
  {
    title: `Tech Digest · ${siteConfig.siteName}`,
    description: 'Daily AI and developer-tooling briefings, with evidence-first summaries and X-ready draft packages.',
    url: routeUrl('tech'),
    jsonLd: escapeJsonForHtml({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI Daily Briefing Hub',
      url: routeUrl('tech'),
      description: 'Daily AI and developer-tooling briefings, with evidence-first summaries and X-ready draft packages.',
    }),
  },
  renderStaticTechHub({
    latestDigest,
    latestDraft,
    highlightItems: techNews.slice(0, 3),
    archiveDigests: digests.slice(1),
  })
);

for (const topic of topics) {
  const topicPosts = nonDigestPosts.filter(post => post.topicSlug === topic.slug || topic.latestPostSlugs?.includes(post.slug));
  writeRouteHtml(
    template,
    `topic/${topic.slug}`,
    {
      title: `${topic.labelEn} · ${siteConfig.siteName}`,
      description: `Posts and notes grouped under ${topic.labelEn}.`,
      url: routeUrl(`topic/${topic.slug}`),
      jsonLd: escapeJsonForHtml({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: topic.labelEn,
        url: routeUrl(`topic/${topic.slug}`),
        description: `Posts and notes grouped under ${topic.labelEn}.`,
      }),
    },
    renderStaticTopicPage(topic, topicPosts)
  );
}

for (const post of posts) {
  if (post.kind === 'digest' || post.slug.startsWith('ai-daily-')) {
    const digestDetail = digestDetails.find(item => item.slug === post.slug);
    const draft = xDrafts.find(item => item.digestSlug === post.slug);
    const { route, bodyHtml } = renderStaticDigest(post, digestDetail, digests, draft);
    writeRouteHtml(template, `blog/${post.slug}`, route, bodyHtml);
    continue;
  }

  const { route, bodyHtml } = renderStaticArticle(post, nonDigestPosts);
  writeRouteHtml(template, `blog/${post.slug}`, route, bodyHtml);
}

writeFeed(postsIndex);
write404Page();
writeCname();
writeSitemap(postsIndex, topics);

console.log(`✓ Static routes: prerendered home, blog, tech, ${topics.length} topic pages, ${posts.length} article pages, feed.xml, sitemap.xml, robots.txt, CNAME, and 404.html`);
