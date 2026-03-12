import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const POSTS_FILE = path.join(ROOT, 'src', 'data', 'posts.json');
const POSTS_INDEX_FILE = path.join(ROOT, 'src', 'data', 'posts-index.json');
const SITE_URL = (process.env.SITE_URL || 'https://shangguangtao567-thomas.github.io/thomas-blog').replace(/\/$/, '');
const DEFAULT_TITLE = "Thomas's Blog · AI · Open Source · Vibe Coding";
const DEFAULT_DESCRIPTION = 'Tech enthusiast, turning ideas into reality with vibe coding. Thoughts on AI, open source tools, and tech trends.';

marked.setOptions({
  gfm: true,
});

function ensureDistExists() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ not found. Run vite build before postbuild-static-routes.');
  }
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

function upsertTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
}

function upsertMeta(html, attr, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<meta\\s+${attr}="${escapedKey}"[^>]*>`, 'i');
  return upsertTag(html, pattern, `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`);
}

function upsertLink(html, rel, href) {
  const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`<link\\s+rel="${escapedRel}"[^>]*>`, 'i');
  return upsertTag(html, pattern, `<link rel="${rel}" href="${escapeAttr(href)}" />`);
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
  html = upsertMeta(html, 'property', 'og:site_name', "Thomas's Blog");
  html = upsertMeta(html, 'property', 'og:title', route.title);
  html = upsertMeta(html, 'property', 'og:description', route.description);
  html = upsertMeta(html, 'property', 'og:url', route.url);
  html = upsertMeta(html, 'name', 'twitter:card', route.image ? 'summary_large_image' : 'summary');
  html = upsertMeta(html, 'name', 'twitter:title', route.title);
  html = upsertMeta(html, 'name', 'twitter:description', route.description);
  html = upsertLink(html, 'canonical', route.url);

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
  const targetDir = routePath ? path.join(DIST_DIR, routePath) : DIST_DIR;
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
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Redirecting…</title>
    <meta name="robots" content="noindex" />
    <script>
      const pathSegmentsToKeep = 1;
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

function writeSitemap(posts) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { url: `${SITE_URL}/`, lastmod: today },
    { url: `${SITE_URL}/blog`, lastmod: posts[0]?.publishedAt || today },
    { url: `${SITE_URL}/tech`, lastmod: today },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastmod: post.publishedAt || today,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(({ url, lastmod }) => `  <url>\n    <loc>${escapeXml(url)}</loc>\n    <lastmod>${escapeXml(lastmod)}</lastmod>\n  </url>`)
  .join('\n')}
</urlset>
`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), xml);
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
  );
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

function toAbsoluteUrl(url) {
  if (!url) return '';
  return new URL(url, `${SITE_URL}/`).toString();
}

function renderStaticArticle(post) {
  const title = post.titleEn || post.titleZh || post.slug;
  const description = post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION;
  const articleTag = post.tagEn || post.tag || 'Tech';
  const articleUrl = `${SITE_URL}/blog/${post.slug}`;
  const imageUrl = toAbsoluteUrl(post.image || '');
  const publishedAt = post.publishedAt || '';
  const contentMarkdown = post.contentEn || post.contentZh || '';
  const contentHtml = contentMarkdown ? marked.parse(contentMarkdown) : '<p>Article content coming soon.</p>';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': post.kind === 'digest' ? 'BlogPosting' : 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: publishedAt,
    articleSection: articleTag,
    inLanguage: post.contentEn ? 'en' : 'zh-CN',
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    author: {
      '@type': 'Person',
      name: 'Thomas',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Thomas',
      url: SITE_URL,
    },
    ...(imageUrl ? { image: [imageUrl] } : {}),
  };

  const bodyHtml = `
<div class="min-h-screen">
  <header class="border-b border-border">
    <div class="max-w-5xl mx-auto px-6 md:px-8 py-4 flex items-center justify-between gap-6">
      <a href="${SITE_URL}/" class="font-display text-xl text-foreground" style="text-decoration: none;">Thomas</a>
      <nav class="flex items-center gap-5 text-sm font-ui">
        <a href="${SITE_URL}/" class="text-muted-foreground hover:text-foreground" style="text-decoration: none;">Home</a>
        <a href="${SITE_URL}/blog/" class="text-foreground" style="text-decoration: none;">Blog</a>
        <a href="${SITE_URL}/tech/" class="text-muted-foreground hover:text-foreground" style="text-decoration: none;">Tech</a>
      </nav>
    </div>
  </header>

  <main>
    <article class="max-w-2xl mx-auto px-6 md:px-8 pt-10 pb-20">
      <a
        href="${SITE_URL}/blog/"
        class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-8"
        style="text-decoration: none;"
      >
        <span aria-hidden="true">←</span>
        <span>Back to Blog</span>
      </a>

      ${imageUrl ? `<div class="rounded-2xl overflow-hidden aspect-[16/7] mb-10"><img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(title)}" class="w-full h-full object-cover" /></div>` : ''}

      <div class="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground font-ui">
        <span>${escapeHtml(formatDisplayDate(publishedAt))}</span>
        <span>${escapeHtml(String(post.readTime || ''))} min read</span>
        <span class="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium" style="background: var(--secondary); color: var(--secondary-foreground);">
          ${escapeHtml(articleTag)}
        </span>
      </div>

      <h1 class="text-3xl md:text-4xl font-display text-foreground leading-tight mb-4">${escapeHtml(title)}</h1>
      <p class="text-sm md:text-base text-muted-foreground font-ui leading-relaxed mb-8">${escapeHtml(description)}</p>

      <div class="prose-article">
        ${contentHtml}
      </div>

      <div class="mt-16 pt-8 border-t border-border">
        <a
          href="${SITE_URL}/blog/"
          class="inline-flex items-center gap-2 text-sm font-ui text-muted-foreground hover:text-foreground transition-colors"
          style="text-decoration: none;"
        >
          <span aria-hidden="true">←</span>
          <span>Back to all posts</span>
        </a>
      </div>
    </article>
  </main>

  <footer class="border-t border-border py-10 text-center">
    <p class="text-xs text-muted-foreground font-ui">© 2026 Thomas. All rights reserved.</p>
  </footer>
</div>
`.trim();

  return {
    route: {
      title: `${title} · Thomas's Blog`,
      description,
      url: articleUrl,
      type: post.kind === 'digest' ? 'website' : 'article',
      image: imageUrl,
      publishedAt,
      section: articleTag,
      jsonLd: escapeJsonForHtml(jsonLd),
    },
    bodyHtml,
  };
}

function renderStaticBlogIndex(posts) {
  const articleCards = posts
    .filter((post) => !post.slug.startsWith('ai-daily-'))
    .map((post, index) => {
      const title = post.titleEn || post.titleZh || post.slug;
      const excerpt = post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION;
      const tag = post.tagEn || post.tag || 'Tech';
      return `
        <a
          href="${SITE_URL}/blog/${post.slug}/"
          class="block rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
          style="text-decoration: none;"
        >
          <div class="flex items-start gap-4">
            <span class="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right" style="color: color-mix(in oklch, var(--muted-foreground) 40%, transparent);">
              ${String(index + 1).padStart(2, '0')}
            </span>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-3 mb-1">
                <h2 class="text-sm font-semibold text-foreground font-ui">${escapeHtml(title)}</h2>
                <span class="text-[10px] font-medium px-2 py-0.5 rounded-md font-ui bg-secondary text-secondary-foreground flex-shrink-0" style="background: var(--secondary); color: var(--secondary-foreground);">
                  ${escapeHtml(tag)}
                </span>
              </div>
              <p class="text-xs text-muted-foreground font-ui mb-2">${escapeHtml(excerpt)}</p>
              <div class="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                <span>${escapeHtml(formatDisplayDate(post.publishedAt || ''))}</span>
                <span>${escapeHtml(String(post.readTime || ''))} min</span>
              </div>
            </div>
          </div>
        </a>
      `.trim();
    })
    .join('\n');

  return `
<div class="min-h-screen">
  <main class="px-6 md:px-8 py-10 max-w-3xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-foreground font-display mb-1.5">Blog</h1>
      <p class="text-sm text-muted-foreground font-ui">${posts.length} posts about AI, open source tools, and tech trends</p>
    </div>
    <div class="space-y-3">
      ${articleCards}
    </div>
  </main>
</div>
`.trim();
}

ensureDistExists();

const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
const postsIndex = JSON.parse(fs.readFileSync(POSTS_INDEX_FILE, 'utf-8'));
const posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));

writeRouteHtml(template, '', {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  url: `${SITE_URL}/`,
});

writeRouteHtml(
  template,
  'blog',
  {
    title: "Blog · Thomas's Blog",
    description: 'Essays and notes on AI, open source tools, agent workflows, and product thinking.',
    url: `${SITE_URL}/blog`,
  },
  renderStaticBlogIndex(postsIndex.filter((post) => !post.slug.startsWith('ai-daily-')))
);

writeRouteHtml(template, 'tech', {
  title: "Tech Digest · Thomas's Blog",
  description: 'Daily AI and developer-tooling briefings, curated with context and evidence.',
  url: `${SITE_URL}/tech`,
});

for (const post of posts) {
  const { route, bodyHtml } = renderStaticArticle(post);
  writeRouteHtml(template, path.join('blog', post.slug), route, bodyHtml);
}

write404Page();
writeSitemap(postsIndex);

console.log(`✓ Static articles: prerendered ${posts.length} article pages with body HTML, JSON-LD, sitemap.xml, robots.txt, and 404.html`);
