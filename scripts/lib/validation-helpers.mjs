import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

export const rootDir = resolve(process.cwd());
export const dataDir = join(rootDir, 'src', 'data');
export const baselineDir = join(rootDir, 'docs', 'baselines');
export const siteConfigPath = join(rootDir, 'site.config.json');

export function readJsonFile(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function readJsonRelative(relativePath) {
  return readJsonFile(join(rootDir, relativePath));
}

export function writeJsonFile(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${stableJson(value)}\n`);
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value), null, 2);
}

export function stableValue(value) {
  if (Array.isArray(value)) return value.map((item) => stableValue(item));
  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const next = stableValue(value[key]);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

export function sha256(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

export function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function titlesOverlap(left = '', right = '') {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  if (normalizedLeft.startsWith('ai daily') && normalizedRight.startsWith('ai daily')) return true;

  const wordsLeft = normalizedLeft.split(/\s+/);
  const wordsRight = normalizedRight.split(/\s+/);
  const minLen = Math.min(wordsLeft.length, wordsRight.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i += 1) {
      if (wordsLeft[i] !== wordsRight[i]) break;
      shared += 1;
    }

    if (shared >= 4 && shared >= minLen * 0.5) return true;
  }

  return false;
}

export function stripLeadingH1(markdown = '', title = '') {
  const match = String(markdown).match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match || !titlesOverlap(match[1], title)) return String(markdown);
  return String(markdown).replace(/^\s*#\s+.+?\s*(?:\n+|$)/, '');
}

export function stripDigestSignature(markdown = '') {
  return String(markdown).replace(/\n+(?:---\s*\n+)?\*?AI\s+Daily\s*\|[^\n]*\*?\s*$/i, '');
}

export function normalizeArticleSource(markdown = '', title = '', { digest = false } = {}) {
  const source = String(markdown || '').replace(/\r\n/g, '\n');
  const stripped = digest ? stripDigestSignature(stripLeadingH1(source, title)) : stripLeadingH1(source, title);
  return stripped.trimEnd();
}

export function normalizePublishedAt(value = '') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function ensureTrailingSlash(path = '') {
  const normalized = String(path || '').trim();
  if (!normalized) return '/';
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

export function toDateValue(value = '') {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function sortByNewest(items = []) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const rightValue = toDateValue(right.item.publishedAt || right.item.date || '');
      const leftValue = toDateValue(left.item.publishedAt || left.item.date || '');
      if (rightValue !== leftValue) return rightValue - leftValue;
      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function isDigestSlug(slug = '') {
  return String(slug || '').startsWith('ai-daily-');
}

export function articleDescription(post = {}) {
  return truncateText(post.excerptEn || post.contentEn || '', 160);
}

export function stripMarkdownForPreview(text = '') {
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

export function truncateText(text = '', max = 180) {
  const normalized = stripMarkdownForPreview(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

export function routeDistPath(routePath = '') {
  const normalized = String(routePath || '/');
  if (normalized === '/') return 'dist/index.html';
  if (normalized === '/feed.xml') return 'dist/feed.xml';
  if (normalized === '/sitemap.xml') return 'dist/sitemap.xml';
  if (normalized === '/404.html') return 'dist/404.html';
  if (normalized.endsWith('/')) return `dist${normalized}index.html`;
  return `dist${normalized}`;
}

export function normalizeEssayRecord(post) {
  const normalized = {
    ...post,
    publishedAt: normalizePublishedAt(post.publishedAt) || post.publishedAt,
  };
  if (typeof normalized.contentEn === 'string') {
    normalized.contentEn = normalizeArticleSource(normalized.contentEn, normalized.titleEn, { digest: isDigestSlug(normalized.slug) });
  }
  if (typeof normalized.contentZh === 'string') {
    normalized.contentZh = normalizeArticleSource(normalized.contentZh, normalized.titleZh || normalized.titleEn, { digest: isDigestSlug(normalized.slug) });
  }
  return normalized;
}

export function normalizeDigestIndexRecord(digest) {
  return {
    ...digest,
    date: normalizePublishedAt(digest.date) || digest.date,
    path: ensureTrailingSlash(digest.path || `/blog/${digest.slug}/`),
  };
}

export function normalizeDigestDetailRecord(detail) {
  return {
    ...detail,
    date: normalizePublishedAt(detail.date) || detail.date,
    generatedAt: normalizePublishedAt(detail.generatedAt) || detail.generatedAt,
    path: ensureTrailingSlash(detail.path || `/blog/${detail.slug}/`),
  };
}

export function normalizeTopicRecord(topic) {
  return {
    ...topic,
  };
}

export function loadSiteConfig() {
  return readJsonFile(siteConfigPath);
}

export function buildContentCollectionManifest({ source, items }) {
  return {
    source,
    count: items.length,
    items: items
      .map((item) => ({
        slug: item.slug,
        hash: sha256(stableValue(item)),
      }))
      .sort((left, right) => left.slug.localeCompare(right.slug)),
  };
}

export function loadFrozenCollections() {
  const posts = readJsonFile(join(dataDir, 'posts.json')).map(normalizeEssayRecord);
  const postsIndex = sortByNewest(readJsonFile(join(dataDir, 'posts-index.json')).map(normalizeEssayRecord));
  const digests = sortByNewest(readJsonFile(join(dataDir, 'ai-digests.json')).map(normalizeDigestIndexRecord));
  const digestDetails = readJsonFile(join(dataDir, 'ai-digest-details.json')).map(normalizeDigestDetailRecord);
  const topics = readJsonFile(join(dataDir, 'topics.json')).map(normalizeTopicRecord);

  return { posts, postsIndex, digests, digestDetails, topics };
}

export function buildContentBaseline({ posts, postsIndex, digests, digestDetails, topics }) {
  return {
    collections: {
      posts: buildContentCollectionManifest({ source: 'src/data/posts.json', items: posts }),
      postsIndex: buildContentCollectionManifest({ source: 'src/data/posts-index.json', items: postsIndex }),
      aiDigests: buildContentCollectionManifest({ source: 'src/data/ai-digests.json', items: digests }),
      aiDigestDetails: buildContentCollectionManifest({ source: 'src/data/ai-digest-details.json', items: digestDetails }),
      topics: buildContentCollectionManifest({ source: 'src/data/topics.json', items: topics }),
    },
  };
}

export function buildDigestArchiveRecords({ posts, digests, digestDetails }) {
  const digestDetailBySlug = new Map(digestDetails.map((detail) => [detail.slug, detail]));
  const digestBySlug = new Map();

  for (const digest of digests) {
    digestBySlug.set(digest.slug, digest);
  }

  for (const post of posts.filter((entry) => isDigestSlug(entry.slug))) {
    if (digestBySlug.has(post.slug)) continue;
    const detail = digestDetailBySlug.get(post.slug);
    digestBySlug.set(post.slug, {
      slug: post.slug,
      date: normalizePublishedAt(post.publishedAt) || post.publishedAt,
      titleEn: detail?.titleEn || post.titleEn,
      excerptEn: detail?.issueSummaryEn || post.excerptEn || post.contentEn || post.titleEn,
      issueSummaryEn: detail?.issueSummaryEn,
      path: ensureTrailingSlash(`/blog/${post.slug}/`),
      itemCount: detail?.items?.length || 0,
      heroTitleEn: detail?.heroTitleEn,
      heroTitleZh: detail?.heroTitleZh,
      limitedUpdateWindow: detail?.limitedUpdateWindow,
      bodyCoverage: detail?.bodyCoverage,
      themes: detail?.themes,
      featuredItems: detail?.featuredItems,
    });
  }

  return sortByNewest([...digestBySlug.values()]);
}

export function buildRouteMetadataList({ siteUrl, posts, digests, digestDetails, topics }) {
  const baseUrl = String(siteUrl || 'https://blog.lincept.com').replace(/\/$/, '');
  const absoluteUrl = (routePath = '/') => `${baseUrl}${String(routePath || '/').startsWith('/') ? routePath : `/${routePath}`}`;
  const orderedPosts = sortByNewest(posts);
  const orderedEssays = orderedPosts.filter((post) => !isDigestSlug(post.slug));
  const digestArchive = buildDigestArchiveRecords({ posts: orderedPosts, digests, digestDetails });
  const essayRoutes = orderedEssays
    .filter((post) => !isDigestSlug(post.slug))
    .map((post) => ({
      kind: 'essay',
      path: `/blog/${post.slug}/`,
      distPath: routeDistPath(`/blog/${post.slug}/`),
      canonical: absoluteUrl(`/blog/${post.slug}/`),
      title: post.seoTitleEn || post.titleEn,
      description: articleDescription(post),
      robots: 'index,follow',
      ogType: 'article',
      jsonLd: true,
      feed: true,
      sitemap: true,
      noindex: false,
      lastmod: normalizePublishedAt(post.publishedAt) || post.publishedAt,
    }));

  const digestDetailBySlug = new Map(digestDetails.map((detail) => [detail.slug, detail]));
  const digestRoutes = digestArchive.map((digest) => {
    const detail = digestDetailBySlug.get(digest.slug);
    const post = orderedPosts.find((item) => item.slug === digest.slug);
    const title = detail?.titleEn || digest.titleEn || post?.titleEn;
    const description = detail?.issueSummaryEn || digest.excerptEn || post?.excerptEn || post?.contentEn || digest.titleEn;
    return {
      kind: 'digest',
      path: `/blog/${digest.slug}/`,
      distPath: routeDistPath(`/blog/${digest.slug}/`),
      canonical: absoluteUrl(`/blog/${digest.slug}/`),
      title,
      description: truncateText(description, 160),
      robots: 'index,follow',
      ogType: 'article',
      jsonLd: true,
      feed: false,
      sitemap: true,
      noindex: false,
      lastmod: detail?.generatedAt || detail?.date || digest.date,
    };
  });

  const topicRoutes = topics.map((topic) => ({
    kind: 'topic',
    path: `/topic/${topic.slug}/`,
    distPath: routeDistPath(`/topic/${topic.slug}/`),
    canonical: absoluteUrl(`/topic/${topic.slug}/`),
    title: `${topic.labelEn} · Thomas`,
    description: `A topic archive for ${topic.labelEn}, with ${topic.count} linked essays.`,
    robots: 'index,follow',
    ogType: 'website',
    jsonLd: true,
    feed: false,
    sitemap: true,
    noindex: false,
    lastmod: orderedEssays.find((post) => post.topicSlug === topic.slug)?.publishedAt || new Date().toISOString(),
  }));

  return [
    {
      kind: 'home',
      path: '/',
      distPath: routeDistPath('/'),
      canonical: absoluteUrl('/'),
      title: 'Thomas · Editorial research desk for AI, open source, and agent-era engineering',
      description: 'Editorial notes on AI infrastructure, open source tooling, and the mechanics of building in the agent era.',
      robots: 'index,follow',
      ogType: 'website',
      jsonLd: true,
      feed: false,
      sitemap: true,
      noindex: false,
      lastmod: orderedEssays[0]?.publishedAt || digestArchive[0]?.date || new Date().toISOString(),
    },
    {
      kind: 'blog-index',
      path: '/blog/',
      distPath: routeDistPath('/blog/'),
      canonical: absoluteUrl('/blog/'),
      title: 'Writing · Thomas',
      description: 'Essays, reviews, and explainers.',
      robots: 'index,follow',
      ogType: 'website',
      jsonLd: true,
      feed: false,
      sitemap: true,
      noindex: false,
      lastmod: orderedEssays[0]?.publishedAt || new Date().toISOString(),
    },
    {
      kind: 'briefing-index',
      path: '/briefing/',
      distPath: routeDistPath('/briefing/'),
      canonical: absoluteUrl('/briefing/'),
      title: 'AI Briefing · Thomas',
      description: 'Daily AI briefings and the archive around them.',
      robots: 'index,follow',
      ogType: 'website',
      jsonLd: true,
      feed: false,
      sitemap: true,
      noindex: false,
      lastmod: digestArchive[0]?.date || new Date().toISOString(),
    },
    {
      kind: 'compat',
      path: '/tech/',
      distPath: routeDistPath('/tech/'),
      canonical: absoluteUrl('/briefing/'),
      title: 'AI Briefing · Thomas',
      description: 'Compatibility entry point for the AI briefing archive.',
      robots: 'noindex,follow',
      ogType: 'website',
      jsonLd: true,
      feed: false,
      sitemap: false,
      noindex: true,
      refreshTo: '/briefing/',
      lastmod: digestArchive[0]?.date || new Date().toISOString(),
    },
    {
      kind: 'not-found',
      path: '/404.html',
      distPath: routeDistPath('/404.html'),
      canonical: absoluteUrl('/404.html'),
      title: 'Not found · Thomas',
      description: 'The requested page does not exist.',
      robots: 'noindex,follow',
      ogType: 'website',
      jsonLd: true,
      feed: false,
      sitemap: false,
      noindex: true,
      lastmod: new Date().toISOString(),
    },
    ...essayRoutes,
    ...digestRoutes,
    ...topicRoutes,
  ].sort((left, right) => left.path.localeCompare(right.path));
}

export function buildRouteBaseline({ siteUrl, posts, digests, digestDetails, topics }) {
  return {
    siteUrl,
    htmlRoutes: buildRouteMetadataList({ siteUrl, posts, digests, digestDetails, topics }),
    assets: buildFixtureMatrix({ posts, digests, digestDetails, topics }).assets,
  };
}

export function buildFixtureMatrix({ posts = [], digests = [], digestDetails = [], topics = [] } = {}) {
  const orderedPosts = sortByNewest(posts);
  const essays = orderedPosts.filter((post) => !isDigestSlug(post.slug));
  const digestArchive = buildDigestArchiveRecords({ posts: orderedPosts, digests, digestDetails });
  const structuredDigestSlugs = new Set(digestDetails.map((detail) => detail.slug));
  const hiddenHeroEssay = essays.find((post) => post.hideHero);
  const leadEssay = essays.find((post) => post.slug !== hiddenHeroEssay?.slug) || essays[0];
  const leadDigest = digestArchive[0];
  const noImageEssay = essays.find((post) => !post.image);
  const withImageEssay = essays.find((post) => post.image && !post.hideHero && post.slug !== leadEssay?.slug);
  const structuredDigest = digestArchive.find((digest) => structuredDigestSlugs.has(digest.slug));
  const markdownDigest = digestArchive.find((digest) => !structuredDigestSlugs.has(digest.slug));
  const leadTopic = [...topics].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.slug.localeCompare(right.slug);
  })[0];
  const singletonTopic = [...topics]
    .filter((topic) => topic.count === 1)
    .sort((left, right) => left.slug.localeCompare(right.slug))[0];

  return {
    htmlKinds: {
      home: { jsonLd: true, robots: 'index,follow', ogType: 'website' },
      'blog-index': { jsonLd: true, robots: 'index,follow', ogType: 'website' },
      'briefing-index': { jsonLd: true, robots: 'index,follow', ogType: 'website' },
      compat: { jsonLd: false, robots: 'noindex,follow', ogType: 'website', refreshTo: '/briefing/' },
      essay: { jsonLd: true, robots: 'index,follow', ogType: 'article' },
      digest: { jsonLd: true, robots: 'index,follow', ogType: 'article' },
      topic: { jsonLd: true, robots: 'index,follow', ogType: 'website' },
      'not-found': { jsonLd: true, robots: 'noindex,follow', ogType: 'website' },
    },
    assets: [
      { kind: 'robots', distPath: 'dist/robots.txt' },
      { kind: 'cname', distPath: 'dist/CNAME' },
      { kind: 'feed', distPath: 'dist/feed.xml' },
      { kind: 'sitemap', distPath: 'dist/sitemap.xml' },
    ],
    screenshots: {
      widths: [390, 1440],
      directories: {
        baseline: 'docs/baselines/screenshots/baseline',
        current: 'docs/baselines/screenshots/current',
        diff: 'docs/baselines/screenshots/diff',
      },
      fixtures: [
        { id: 'home', kind: 'home', path: '/', label: 'Homepage', readySelector: '.hero__title', readyTimeoutMs: 5000 },
        { id: 'blog-index', kind: 'blog-index', path: '/blog/', label: 'Writing index', readySelector: '.hero__title', readyTimeoutMs: 5000 },
        { id: 'briefing-index', kind: 'briefing-index', path: '/briefing/', label: 'Briefing index', readySelector: '.hero__title', readyTimeoutMs: 5000 },
        { id: 'tech-compat', kind: 'compat', path: '/tech/', label: 'Compatibility route', readySelector: '.compat-shell', readyTimeoutMs: 3500 },
        { id: 'not-found', kind: 'not-found', path: '/404.html', label: 'Not found', readySelector: '.compat-shell', readyTimeoutMs: 3500 },
        leadEssay
          ? {
              id: 'essay-lead',
              kind: 'essay',
              path: `/blog/${leadEssay.slug}/`,
              slug: leadEssay.slug,
              label: leadEssay.titleEn,
              readySelector: '.article-header__title',
              readyTimeoutMs: 5000,
            }
          : undefined,
        withImageEssay
          ? {
              id: 'essay-with-image',
              kind: 'essay',
              path: `/blog/${withImageEssay.slug}/`,
              slug: withImageEssay.slug,
              label: withImageEssay.titleEn,
              readySelector: '.article-hero',
              readyTimeoutMs: 5000,
            }
          : undefined,
        hiddenHeroEssay
          ? {
              id: 'essay-hidden-hero',
              kind: 'essay',
              path: `/blog/${hiddenHeroEssay.slug}/`,
              slug: hiddenHeroEssay.slug,
              label: hiddenHeroEssay.titleEn,
              readySelector: '.prose-article',
              readyTimeoutMs: 5000,
            }
          : undefined,
        noImageEssay
          ? {
              id: 'essay-no-image',
              kind: 'essay',
              path: `/blog/${noImageEssay.slug}/`,
              slug: noImageEssay.slug,
              label: noImageEssay.titleEn,
              readySelector: '.reading-path__list',
              readyTimeoutMs: 5000,
            }
          : undefined,
        structuredDigest
          ? {
              id: 'digest-structured',
              kind: 'digest',
              path: `/blog/${structuredDigest.slug}/`,
              slug: structuredDigest.slug,
              label: structuredDigest.titleEn,
              readySelector: '.digest-item, .prose-article',
              readyTimeoutMs: 6000,
            }
          : undefined,
        markdownDigest
          ? {
              id: 'digest-markdown',
              kind: 'digest',
              path: `/blog/${markdownDigest.slug}/`,
              slug: markdownDigest.slug,
              label: markdownDigest.titleEn,
              readySelector: '.prose-article',
              readyTimeoutMs: 5000,
            }
          : undefined,
        leadTopic
          ? {
              id: 'topic-lead',
              kind: 'topic',
              path: `/topic/${leadTopic.slug}/`,
              slug: leadTopic.slug,
              label: leadTopic.labelEn,
              readySelector: '.reading-path__list',
              readyTimeoutMs: 5000,
            }
          : undefined,
        singletonTopic
          ? {
              id: 'topic-singleton',
              kind: 'topic',
              path: `/topic/${singletonTopic.slug}/`,
              slug: singletonTopic.slug,
              label: singletonTopic.labelEn,
              readySelector: '.story-list',
              readyTimeoutMs: 5000,
            }
          : undefined,
      ].filter(Boolean),
    },
    lighthouse: {
      directories: {
        baseline: 'docs/baselines/lighthouse/baseline',
        current: 'docs/baselines/lighthouse/current',
      },
      profiles: [
        {
          id: 'desktop',
          label: 'Desktop',
          config: 'desktop',
          auditTimeoutMs: 45000,
          gates: {
            categories: {
              performance: { min: 0.9 },
              accessibility: { min: 0.95, maxRegression: 0.01 },
              seo: { min: 0.95, maxRegression: 0.01 },
            },
            metrics: {
              'first-contentful-paint': { maxRegression: 150 },
              'largest-contentful-paint': { maxRegression: 250 },
              'total-blocking-time': { maxRegression: 100 },
              'cumulative-layout-shift': { maxRegression: 0.02 },
            },
          },
        },
        {
          id: 'mobile',
          label: 'Mobile',
          config: 'mobile',
          auditTimeoutMs: 45000,
          gates: {
            categories: {
              performance: { min: 0.85 },
              accessibility: { min: 0.95, maxRegression: 0.01 },
              seo: { min: 0.95, maxRegression: 0.01 },
            },
            metrics: {
              'first-contentful-paint': { maxRegression: 250 },
              'largest-contentful-paint': { maxRegression: 400 },
              'total-blocking-time': { maxRegression: 150 },
              'cumulative-layout-shift': { maxRegression: 0.03 },
            },
          },
        },
      ],
      fixtures: [
        { id: 'home', kind: 'home', path: '/', label: 'Homepage' },
        leadEssay
          ? {
              id: 'essay-lead',
              kind: 'essay',
              path: `/blog/${leadEssay.slug}/`,
              slug: leadEssay.slug,
              label: leadEssay.titleEn,
            }
          : undefined,
        { id: 'briefing-index', kind: 'briefing-index', path: '/briefing/', label: 'Briefing index' },
        leadDigest
          ? {
              id: 'digest-lead',
              kind: 'digest',
              path: `/blog/${leadDigest.slug}/`,
              slug: leadDigest.slug,
              label: leadDigest.titleEn,
            }
          : undefined,
        leadTopic
          ? {
              id: 'topic-lead',
              kind: 'topic',
              path: `/topic/${leadTopic.slug}/`,
              slug: leadTopic.slug,
              label: leadTopic.labelEn,
            }
          : undefined,
      ].filter(Boolean),
    },
  };
}
