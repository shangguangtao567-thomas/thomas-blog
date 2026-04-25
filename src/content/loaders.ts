import postsIndexJson from '../data/posts-index.json';
import postsJson from '../data/posts.json';
import digestsJson from '../data/ai-digests.json';
import digestDetailsJson from '../data/ai-digest-details.json';
import topicsJson from '../data/topics.json';
import xDraftsJson from '../data/x-drafts.json';
import type {
  AiDigestDetail,
  AiDigestIndexItem,
  Post,
  TopicIndexItem,
} from './contracts';
import { normalizePublishedAt } from './normalize';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function isDigestSlug(slug = '') {
  return String(slug || '').startsWith('ai-daily-');
}

function ensureTrailingSlash(path = '') {
  const normalized = String(path || '').trim();
  if (!normalized) return '/';
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function toDateValue(value = '') {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByNewest<T extends { publishedAt?: string; date?: string }>(items: T[]) {
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

function normalizePost(post: Post): Post {
  return {
    ...post,
    publishedAt: normalizePublishedAt(post.publishedAt) || post.publishedAt,
  };
}

function normalizeDigestDetail(detail: AiDigestDetail): AiDigestDetail {
  return {
    ...detail,
    date: normalizePublishedAt(detail.date) || detail.date,
    generatedAt: normalizePublishedAt(detail.generatedAt) || detail.generatedAt,
    path: ensureTrailingSlash(detail.path || `/blog/${detail.slug}`),
  };
}

export function loadPostsIndex(): Post[] {
  return clone(postsIndexJson).map(normalizePost);
}

export function loadPosts(): Post[] {
  return clone(postsJson).map(normalizePost);
}

export function loadArticleIndex(): Post[] {
  return sortByNewest(loadPostsIndex());
}

export function loadEssayPosts(): Post[] {
  return sortByNewest(loadPostsIndex().filter((post) => !isDigestSlug(post.slug)));
}

export function loadDigestPosts(): Post[] {
  return sortByNewest(loadPostsIndex().filter((post) => isDigestSlug(post.slug)));
}

export function loadPostBySlug(slug: string): Post | undefined {
  return loadPosts().find((post) => post.slug === slug);
}

export function loadEssayPostBySlug(slug: string): Post | undefined {
  return loadEssayPosts().find((post) => post.slug === slug);
}

export function loadDigestPostBySlug(slug: string): Post | undefined {
  return loadDigestPosts().find((post) => post.slug === slug);
}

export function loadDigestsIndex(): AiDigestIndexItem[] {
  return sortByNewest(
    clone(digestsJson).map((digest: AiDigestIndexItem) => ({
      ...digest,
      path: ensureTrailingSlash(digest.path || `/blog/${digest.slug}`),
    })),
  );
}

export function loadDigestDetails(): AiDigestDetail[] {
  return clone(digestDetailsJson).map(normalizeDigestDetail);
}

export function loadDigestDetailBySlug(slug: string): AiDigestDetail | undefined {
  return loadDigestDetails().find((detail) => detail.slug === slug);
}

export function loadDigestArchive(): AiDigestIndexItem[] {
  const digestIndex = loadDigestsIndex();
  const digestPosts = loadDigestPosts();
  const detailBySlug = new Map(loadDigestDetails().map((detail) => [detail.slug, detail]));
  const archiveBySlug = new Map<string, AiDigestIndexItem>();

  for (const digest of digestIndex) {
    archiveBySlug.set(digest.slug, digest);
  }

  for (const post of digestPosts) {
    if (archiveBySlug.has(post.slug)) continue;
    const detail = detailBySlug.get(post.slug);
    archiveBySlug.set(post.slug, {
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

  return sortByNewest([...archiveBySlug.values()]);
}

export function loadTopics(): TopicIndexItem[] {
  return clone(topicsJson);
}

export function loadTopicBySlug(slug: string): TopicIndexItem | undefined {
  return loadTopics().find((topic) => topic.slug === slug);
}

export function loadXDrafts() {
  return clone(xDraftsJson);
}

export function loadFeaturedPostsByTopicSlug(topicSlug: string): Post[] {
  const posts = loadEssayPosts();
  const topic = loadTopicBySlug(topicSlug);
  if (!topic) return [];

  return (topic.latestPostSlugs || [])
    .map((slug) => posts.find((post) => post.slug === slug && post.topicSlug === topicSlug))
    .filter(Boolean) as Post[];
}

export function loadPostsByTopicSlug(topicSlug: string): Post[] {
  return sortByNewest(loadEssayPosts().filter((post) => post.topicSlug === topicSlug));
}

export function isDigestPost(slug = '') {
  return isDigestSlug(slug);
}
