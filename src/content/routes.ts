import { siteConfig } from '../lib/siteConfig';
import type { PageMeta, RouteManifestEntry } from './contracts';
import {
  loadDigestDetailBySlug,
  loadDigestArchive,
  loadEssayPostBySlug,
  loadEssayPosts,
  loadFeaturedPostsByTopicSlug,
  loadPostsByTopicSlug,
  loadTopics,
  loadPostBySlug,
  isDigestPost,
} from './loaders';
import { normalizePublishedAt, renderMarkdownHtml, truncateText } from './normalize';
import { buildArticleContinuation, buildBriefingGuide, buildTopicGuide } from './reading';

function ensureTrailingSlash(path = '') {
  const normalized = String(path || '').trim();
  if (!normalized) return '/';
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function absoluteUrl(path = '') {
  const base = String(siteConfig.siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
  const normalized = String(path || '/');
  return `${base}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

function articleDescription(post: { excerptEn?: string; contentEn?: string }) {
  return truncateText(post.excerptEn || post.contentEn || '', 160);
}

function makePageMeta(route: RouteManifestEntry, overrides: Partial<PageMeta> = {}): PageMeta {
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
  };
}

export function buildRouteManifest(): RouteManifestEntry[] {
  const essays = loadEssayPosts();
  const digests = loadDigestArchive();
  const topics = loadTopics();

  const entries: RouteManifestEntry[] = [
    {
      kind: 'home',
      path: '/',
      canonical: absoluteUrl('/'),
      title: 'Thomas · Editorial research desk for AI, open source, and agent-era engineering',
      description: 'Editorial notes on AI infrastructure, open source tooling, and the mechanics of building in the agent era.',
      robots: 'index,follow',
      ogType: 'website',
      lastmod: essays[0]?.publishedAt || digests[0]?.date || new Date().toISOString(),
      sitemap: true,
      feed: false,
    },
    {
      kind: 'blog-index',
      path: '/blog/',
      canonical: absoluteUrl('/blog/'),
      title: 'Writing · Thomas',
      description: 'Essays, reviews, and explainers.',
      robots: 'index,follow',
      ogType: 'website',
      lastmod: essays[0]?.publishedAt || new Date().toISOString(),
      sitemap: true,
      feed: false,
    },
    {
      kind: 'briefing-index',
      path: '/briefing/',
      canonical: absoluteUrl('/briefing/'),
      title: 'AI Briefing · Thomas',
      description: 'Daily AI briefings and the archive around them.',
      robots: 'index,follow',
      ogType: 'website',
      lastmod: digests[0]?.date || new Date().toISOString(),
      sitemap: true,
      feed: false,
    },
    {
      kind: 'topic-index',
      path: '/topic/',
      canonical: absoluteUrl('/topic/'),
      title: 'Topics · Thomas',
      description: 'Routes through the Thomas living notebook.',
      robots: 'index,follow',
      ogType: 'website',
      lastmod: essays[0]?.publishedAt || digests[0]?.date || new Date().toISOString(),
      sitemap: true,
      feed: false,
    },
    {
      kind: 'compat',
      path: '/tech/',
      canonical: absoluteUrl('/briefing/'),
      title: 'AI Briefing · Thomas',
      description: 'Compatibility entry point for the AI briefing archive.',
      robots: 'noindex,follow',
      ogType: 'website',
      lastmod: digests[0]?.date || new Date().toISOString(),
      sitemap: false,
      feed: false,
      noindex: true,
    },
    {
      kind: 'not-found',
      path: '/404.html',
      canonical: absoluteUrl('/404.html'),
      title: 'Not found · Thomas',
      description: 'The requested page does not exist.',
      robots: 'noindex,follow',
      ogType: 'website',
      lastmod: new Date().toISOString(),
      sitemap: false,
      feed: false,
      noindex: true,
    },
  ];

  for (const post of essays) {
    entries.push({
      kind: 'essay',
      path: `/blog/${post.slug}/`,
      canonical: absoluteUrl(`/blog/${post.slug}/`),
      title: post.seoTitleEn || post.titleEn,
      description: articleDescription(post),
      robots: 'index,follow',
      ogType: 'article',
      publishedAt: normalizePublishedAt(post.publishedAt) || post.publishedAt,
      lastmod: normalizePublishedAt(post.publishedAt) || post.publishedAt,
      image: post.image ? (post.image.startsWith('/') ? absoluteUrl(post.image) : post.image) : undefined,
      keywords: post.keywords || [],
      sitemap: true,
      feed: true,
    });
  }

  for (const digest of digests) {
    const detail = loadDigestDetailBySlug(digest.slug);
    const post = loadPostBySlug(digest.slug) || loadEssayPostBySlug(digest.slug);
    const title = detail?.titleEn || post?.titleEn || digest.titleEn;
    const description = detail?.issueSummaryEn || digest.excerptEn || post?.excerptEn || post?.contentEn || digest.titleEn;
    entries.push({
      kind: 'digest',
      path: `/blog/${digest.slug}/`,
      canonical: absoluteUrl(`/blog/${digest.slug}/`),
      title,
      description: truncateText(description, 160),
      robots: 'index,follow',
      ogType: 'article',
      publishedAt: detail?.date || digest.date,
      lastmod: detail?.generatedAt || detail?.date || digest.date,
      image: post?.image ? (post.image.startsWith('/') ? absoluteUrl(post.image) : post.image) : undefined,
      keywords: ['AI Daily', 'AI briefing', ...(detail?.themes || []).map((theme) => theme.themeEn).filter(Boolean)],
      sitemap: true,
      feed: false,
    });
  }

  for (const topic of topics) {
    const topicPosts = loadPostsByTopicSlug(topic.slug);
    entries.push({
      kind: 'topic',
      path: `/topic/${topic.slug}/`,
      canonical: absoluteUrl(`/topic/${topic.slug}/`),
      title: `${topic.labelEn} · Thomas`,
      description: `A topic archive for ${topic.labelEn}, with ${topic.count} linked essays.`,
      robots: 'index,follow',
      ogType: 'website',
      lastmod: topicPosts[0]?.publishedAt || new Date().toISOString(),
      sitemap: true,
      feed: false,
    });
  }

  return entries;
}

export function getRouteManifest() {
  return buildRouteManifest();
}

export function getRouteEntry(path: string) {
  const normalized = ensureTrailingSlash(path);
  return buildRouteManifest().find((entry) => ensureTrailingSlash(entry.path) === normalized);
}

export function getStaticPageMeta(path: string, overrides: Partial<PageMeta> = {}) {
  const route = getRouteEntry(path);
  if (!route) throw new Error(`No route entry for ${path}`);
  return makePageMeta(route, overrides);
}

export function getEssayFeedItems() {
  return loadEssayPosts().map((post) => ({
    title: post.titleEn,
    link: absoluteUrl(`/blog/${post.slug}/`),
    guid: absoluteUrl(`/blog/${post.slug}/`),
    pubDate: new Date(post.publishedAt).toUTCString(),
    description: truncateText(post.excerptEn || post.contentEn || '', 240),
    content: renderMarkdownHtml(post.contentEn || post.excerptEn || '', post.titleEn),
  }));
}

export function getSitemapEntries() {
  return buildRouteManifest()
    .filter((entry) => entry.sitemap)
    .map((entry) => ({
      loc: entry.canonical,
      lastmod: entry.lastmod || entry.publishedAt || new Date().toISOString(),
    }));
}

export function getHomePageData() {
  const essays = loadEssayPosts();
  const digests = loadDigestArchive();
  const topics = loadTopics();
  return {
    leadEssay: essays[0],
    moreEssays: essays.slice(1, 7),
    latestDigests: digests.slice(0, 3),
    topics: topics.slice(0, 6).map((topic) => ({
      ...topic,
      leadPost: loadPostsByTopicSlug(topic.slug)[0],
      featuredPosts: loadFeaturedPostsByTopicSlug(topic.slug),
    })),
  };
}

export function getBlogPageData() {
  const essays = loadEssayPosts();
  return {
    leadEssay: essays[0],
    restEssays: essays.slice(1),
  };
}

export function getBriefingPageData() {
  const digests = loadDigestArchive();
  return {
    leadDigest: digests[0],
    recentDigests: digests.slice(1, 4),
    archiveDigests: digests.slice(4),
    guide: buildBriefingGuide(digests),
  };
}

export function getTopicPageData(slug: string) {
  const topic = loadTopics().find((item) => item.slug === slug);
  const posts = topic ? loadPostsByTopicSlug(topic.slug) : [];
  const featuredPosts = topic ? loadFeaturedPostsByTopicSlug(topic.slug) : [];
  const guide = topic ? buildTopicGuide(topic, posts, featuredPosts) : undefined;
  return { topic, posts, guide };
}

export function getArticlePageData(slug: string) {
  const post = loadPostBySlug(slug);
  const digestArchive = isDigestPost(slug) ? loadDigestArchive() : [];
  const digestIndex = isDigestPost(slug) ? digestArchive.find((item) => item.slug === slug) : undefined;
  const digestDetail = isDigestPost(slug) ? loadDigestDetailBySlug(slug) : undefined;
  const topic = post?.topicSlug ? loadTopics().find((item) => item.slug === post.topicSlug) : undefined;
  const topicPosts = topic ? loadPostsByTopicSlug(topic.slug) : [];
  const digestPosition = isDigestPost(slug) ? digestArchive.findIndex((item) => item.slug === slug) : -1;
  const digestNeighbors = isDigestPost(slug) && digestPosition >= 0
    ? [
        digestArchive[digestPosition - 1]
          ? { ...digestArchive[digestPosition - 1], relationLabel: 'Newer issue' }
          : undefined,
        digestArchive[digestPosition + 1]
          ? { ...digestArchive[digestPosition + 1], relationLabel: 'Older issue' }
          : undefined,
      ].filter(Boolean)
    : [];
  return {
    post,
    digestIndex,
    digestDetail,
    isDigest: Boolean(digestIndex || digestDetail || isDigestPost(slug)),
    digestNeighbors,
    continuation: post
      ? buildArticleContinuation({
          post,
          isDigest: Boolean(digestIndex || digestDetail || isDigestPost(slug)),
          topic,
          topicPosts,
        })
      : undefined,
  };
}
