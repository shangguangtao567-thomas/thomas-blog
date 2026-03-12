import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'dist');
const POSTS_INDEX_FILE = path.join(ROOT, 'src', 'data', 'posts-index.json');
const SITE_URL = (process.env.SITE_URL || 'https://shangguangtao567-thomas.github.io/thomas-blog').replace(/\/$/, '');
const DEFAULT_TITLE = "Thomas's Blog · AI · Open Source · Vibe Coding";
const DEFAULT_DESCRIPTION = 'Tech enthusiast, turning ideas into reality with vibe coding. Thoughts on AI, open source tools, and tech trends.';

function ensureDistExists() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error('dist/ not found. Run vite build before postbuild-static-routes.');
  }
}

function escapeAttr(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function upsertTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `  ${replacement}\n</head>`);
}

function upsertMeta(html, attr, key, content) {
  const pattern = new RegExp(`<meta\\s+${attr}="${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"[^>]*>`, 'i');
  return upsertTag(html, pattern, `<meta ${attr}="${key}" content="${escapeAttr(content)}" />`);
}

function upsertLink(html, rel, href) {
  const pattern = new RegExp(`<link\\s+rel="${rel.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}"[^>]*>`, 'i');
  return upsertTag(html, pattern, `<link rel="${rel}" href="${escapeAttr(href)}" />`);
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(title)}</title>`);
}

function renderHtml(template, route) {
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

  return html;
}

function writeRouteHtml(template, routePath, route) {
  const targetDir = routePath ? path.join(DIST_DIR, routePath) : DIST_DIR;
  fs.mkdirSync(targetDir, { recursive: true });
  const targetFile = path.join(targetDir, 'index.html');
  fs.writeFileSync(targetFile, renderHtml(template, route));
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
  const urls = [
    { url: `${SITE_URL}/`, lastmod: new Date().toISOString().slice(0, 10) },
    { url: `${SITE_URL}/blog`, lastmod: posts[0]?.publishedAt || new Date().toISOString().slice(0, 10) },
    { url: `${SITE_URL}/tech`, lastmod: new Date().toISOString().slice(0, 10) },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastmod: post.publishedAt || new Date().toISOString().slice(0, 10),
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

ensureDistExists();

const template = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
const posts = JSON.parse(fs.readFileSync(POSTS_INDEX_FILE, 'utf-8'));

writeRouteHtml(template, '', {
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  url: `${SITE_URL}/`,
});

writeRouteHtml(template, 'blog', {
  title: "Blog · Thomas's Blog",
  description: 'Essays and notes on AI, open source tools, agent workflows, and product thinking.',
  url: `${SITE_URL}/blog`,
});

writeRouteHtml(template, 'tech', {
  title: "Tech Digest · Thomas's Blog",
  description: 'Daily AI and developer-tooling briefings, curated with context and evidence.',
  url: `${SITE_URL}/tech`,
});

for (const post of posts) {
  writeRouteHtml(template, path.join('blog', post.slug), {
    title: `${post.titleEn || post.titleZh} · Thomas's Blog`,
    description: post.excerptEn || post.excerptZh || DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/blog/${post.slug}`,
    type: 'article',
    image: post.image || '',
    publishedAt: post.publishedAt || '',
    section: post.tagEn || post.tag || '',
  });
}

write404Page();
writeSitemap(posts);

console.log(`✓ SEO routes: generated ${posts.length + 3} route HTML files plus sitemap.xml, robots.txt, and 404.html`);
