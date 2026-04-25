import { siteConfig } from '../lib/siteConfig';
import type { PageMeta } from './contracts';
import { getRouteEntry, getRouteManifest } from './routes';

function absoluteUrl(path = '') {
  const base = String(siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
  const normalized = String(path || '/');
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildPageMeta(path: string, overrides: Partial<PageMeta> = {}) {
  const route = getRouteEntry(path);
  if (!route) throw new Error(`No route entry for ${path}`);

  return {
    title: overrides.title || route.title,
    description: overrides.description || route.description,
    canonical: overrides.canonical || route.canonical,
    robots: overrides.robots || route.robots,
    ogType: overrides.ogType || route.ogType,
    image: overrides.image || route.image,
    publishedAt: overrides.publishedAt || route.publishedAt,
    lastmod: overrides.lastmod || route.lastmod,
    keywords: overrides.keywords || route.keywords,
    jsonLd: overrides.jsonLd,
    alternateLinks: overrides.alternateLinks || [],
    refreshTo: overrides.refreshTo,
  } satisfies PageMeta;
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.siteName,
    url: absoluteUrl('/'),
    author: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: absoluteUrl('/'),
    },
  };
}

export function buildCollectionJsonLd(name: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
  };
}

export function buildTopicJsonLd(name: string, description: string, url: string, count: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    about: {
      '@type': 'Thing',
      name,
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: count,
    },
  };
}

export function buildArticleJsonLd(post: {
  titleEn: string;
  excerptEn?: string;
  contentEn?: string;
  publishedAt: string;
  image?: string;
  keywords?: string[];
  slug: string;
}, options: { canonical: string; section: string; isDigest?: boolean }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titleEn,
    description: post.excerptEn || post.contentEn || '',
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: absoluteUrl('/'),
    },
    publisher: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: absoluteUrl('/'),
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': options.canonical,
    },
    url: options.canonical,
    articleSection: options.section,
    keywords: (post.keywords || []).join(', '),
    wordCount: post.contentEn ? post.contentEn.split(/\s+/).length : 0,
    ...(post.image ? { image: post.image.startsWith('/') ? absoluteUrl(post.image) : post.image } : {}),
  };
}

export function buildArticlePageMeta(path: string, overrides: Partial<PageMeta> = {}) {
  return buildPageMeta(path, overrides);
}

export function renderJsonLd(value: unknown) {
  return JSON.stringify(value, null, 2);
}

export function buildFeedXml(items: Array<{ title: string; link: string; guid: string; pubDate: string; description: string; content: string }>) {
  const body = items.map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid>${escapeXml(item.guid)}</guid>
      <pubDate>${escapeXml(item.pubDate)}</pubDate>
      <description>${escapeXml(item.description)}</description>
      <content:encoded><![CDATA[${item.content}]]></content:encoded>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteConfig.siteName)}</title>
    <link>${escapeXml(absoluteUrl('/'))}</link>
    <description>${escapeXml('Editorial notes on AI infrastructure, open source tooling, and the mechanics of building in the agent era.')}</description>
    <language>en-us</language>
    <lastBuildDate>${escapeXml(new Date().toUTCString())}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl('/feed.xml'))}" rel="self" type="application/rss+xml" />
    ${body}
  </channel>
</rss>`;
}

export function buildSitemapXml(entries: Array<{ loc: string; lastmod: string }>) {
  const body = entries.map((entry) => `
    <url>
      <loc>${escapeXml(entry.loc)}</loc>
      <lastmod>${escapeXml(entry.lastmod)}</lastmod>
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${body}
</urlset>`;
}

export function getManifest() {
  return getRouteManifest();
}
