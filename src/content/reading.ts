import type { AiDigestIndexItem, Post, TopicIndexItem } from './contracts';
import { loadDigestArchive, loadEssayPosts } from './loaders';
import { truncateText } from './normalize';

export interface ReadingPathEntry {
  kind: 'essay' | 'digest' | 'topic' | 'archive';
  href: string;
  label: string;
  title: string;
  description: string;
  date?: string;
  readTime?: number;
  itemCount?: number;
}

export interface BriefingGuide {
  intro: string;
  steps: ReadingPathEntry[];
}

export interface TopicGuide {
  intro: string;
  rangeLabel: string;
  modeLabel: string;
  startHere: ReadingPathEntry[];
  continueTitle: string;
  continueCopy: string;
  continueReading: ReadingPathEntry[];
}

export interface ArticleContinuation {
  eyebrow: string;
  title: string;
  intro: string;
  contextTitle: string;
  contextCopy: string;
  contextMeta: string[];
  items: ReadingPathEntry[];
}

function toDateValue(value = '') {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function sortByDateDesc<T extends { publishedAt?: string; date?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const rightValue = toDateValue(right.publishedAt || right.date || '');
    const leftValue = toDateValue(left.publishedAt || left.date || '');
    return rightValue - leftValue;
  });
}

function sortByDateAsc<T extends { publishedAt?: string; date?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftValue = toDateValue(left.publishedAt || left.date || '');
    const rightValue = toDateValue(right.publishedAt || right.date || '');
    return leftValue - rightValue;
  });
}

function uniqueByHref<T extends { href: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.href || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

function monthYear(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function monthShort(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
  });
}

function humanJoin(items: string[]) {
  const values = items.filter(Boolean);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function toEssayEntry(post: Post, label: string, description?: string): ReadingPathEntry {
  return {
    kind: 'essay',
    href: `/blog/${post.slug}/`,
    label,
    title: post.titleEn,
    description: description || truncateText(post.excerptEn || post.contentEn || '', 180),
    date: post.publishedAt,
    readTime: post.readTime,
  };
}

function toDigestEntry(digest: AiDigestIndexItem, label: string, description?: string): ReadingPathEntry {
  return {
    kind: 'digest',
    href: digest.path || `/blog/${digest.slug}/`,
    label,
    title: digest.titleEn,
    description: description || truncateText(digest.issueSummaryEn || digest.excerptEn || digest.titleEn, 180),
    date: digest.date,
    itemCount: digest.itemCount,
  };
}

function toTopicArchiveEntry(topic: TopicIndexItem, description: string): ReadingPathEntry {
  return {
    kind: 'topic',
    href: `/topic/${topic.slug}/`,
    label: 'Open the thread map',
    title: `${topic.labelEn} topic archive`,
    description,
  };
}

export function buildBriefingGuide(digests: AiDigestIndexItem[]): BriefingGuide {
  const sortedDigests = sortByDateDesc(digests);
  const latestDigest = sortedDigests[0];
  const catchUpCount = Math.min(sortedDigests.length, 4);

  return {
    intro:
      'Use the latest issue as the daily front door. If you missed a few days, scan the recent stack in order before dropping into the full dated archive.',
    steps: uniqueByHref([
      latestDigest
        ? toDigestEntry(latestDigest, 'Start here', 'Open the latest issue first. It is the fastest way to re-enter the desk at the current day.')
        : undefined,
      {
        kind: 'archive',
        href: '/briefing/#recent-issues',
        label: 'Catch up',
        title: `Read the last ${catchUpCount} issues in sequence`,
        description: 'The recent stack rebuilds context quickly when the archive has moved a few days ahead of you.',
      },
      {
        kind: 'archive',
        href: '/briefing/#archive',
        label: 'Track a theme',
        title: 'Work backward through the dated archive',
        description: 'Older issues are listed as a ledger, so recurring themes show up without any extra filtering.',
      },
    ].filter(Boolean) as ReadingPathEntry[]),
  };
}

function formatTopicRange(latestDate = '', firstDate = '') {
  if (!latestDate) return '';

  const latest = new Date(latestDate);
  const first = new Date(firstDate || latestDate);
  if (Number.isNaN(latest.getTime()) || Number.isNaN(first.getTime())) return monthYear(latestDate);
  if (latest.getFullYear() === first.getFullYear() && latest.getMonth() === first.getMonth()) {
    return monthYear(latestDate);
  }
  if (latest.getFullYear() === first.getFullYear()) {
    return `${monthShort(firstDate)} to ${monthYear(latestDate)}`;
  }
  return `${monthYear(firstDate)} to ${monthYear(latestDate)}`;
}

export function buildTopicGuide(
  topic: TopicIndexItem,
  posts: Post[],
  featuredPosts: Post[] = [],
  fallbackPosts: Post[] = loadEssayPosts(),
): TopicGuide {
  const sortedPosts = sortByDateDesc(posts);
  const ascendingPosts = sortByDateAsc(posts);
  const latestPost = sortedPosts[0];
  const firstPost = ascendingPosts[0];
  const tags = [...new Set(sortedPosts.map((post) => post.tagEn).filter(Boolean))];
  const featuredCompanion = featuredPosts.find((post) => post.slug !== latestPost?.slug);
  const startPosts = uniqueByHref(
    [latestPost, featuredCompanion || firstPost]
      .filter(Boolean)
      .map((post, index) =>
        toEssayEntry(
          post as Post,
          index === 0 ? 'Latest entry point' : featuredCompanion ? 'Featured companion read' : 'Foundational read',
          index === 0
            ? 'Start with the newest articulation of the thread before stepping back to its opening move.'
            : featuredCompanion
              ? 'This highlighted earlier essay is the cleanest second step once you have the newest piece in view.'
              : 'This earlier piece gives the thread its original frame.',
        ),
      ),
  );

  const remainingTopicPosts = sortedPosts.filter((post) => !startPosts.some((entry) => entry.href === `/blog/${post.slug}/`));
  const fallbackReading = sortByDateDesc(fallbackPosts)
    .filter((post) => post.topicSlug !== topic.slug)
    .slice(0, 3)
    .map((post, index) =>
      toEssayEntry(
        post,
        index === 0 ? 'Continue from the desk' : 'Another desk note',
        'This topic only has one anchor piece right now, so the broader writing archive is the next best continuation path.',
      ),
    );

  const normalizedContinueReading = remainingTopicPosts.length
    ? remainingTopicPosts.map((post, index) =>
        toEssayEntry(
          post,
          index === 0 ? 'Then read' : 'Keep going',
          'Stay inside the thread and move through the remaining essays in reverse chronology.',
        ),
      )
    : fallbackReading;

  const rangeLabel = formatTopicRange(latestPost?.publishedAt, firstPost?.publishedAt);
  const modeLabel = tags.length ? humanJoin(tags) : topic.labelEn;
  const intro = sortedPosts.length > 1
    ? `This thread currently spans ${sortedPosts.length} essays across ${rangeLabel}. Start with ${latestPost?.titleEn}, then step back to ${featuredCompanion?.titleEn || firstPost?.titleEn} before moving through the rest of the archive.`
    : `${latestPost?.titleEn || topic.labelEn} is currently the single entry point for this topic, so the page works as a precise front door rather than a long archive.`;

  return {
    intro: modeLabel ? `${intro} Across the current set, the writing moves through ${modeLabel}.` : intro,
    rangeLabel,
    modeLabel,
    startHere: startPosts,
    continueTitle: remainingTopicPosts.length ? 'Continue this thread' : 'Continue from the desk',
    continueCopy: remainingTopicPosts.length
      ? 'After those opening reads, continue newest to oldest through the remaining archive.'
      : 'There is only one post in this topic so far. Use the broader writing archive to keep the same editorial pace.',
    continueReading: normalizedContinueReading,
  };
}

export function buildArticleContinuation({
  post,
  isDigest,
  topic,
  topicPosts = [],
}: {
  post: Post;
  isDigest: boolean;
  topic?: TopicIndexItem;
  topicPosts?: Post[];
}): ArticleContinuation {
  if (isDigest) {
    const digests = sortByDateDesc(loadDigestArchive());
    const digestIndex = digests.findIndex((entry) => entry.slug === post.slug);
    const newerDigest = digestIndex > 0 ? digests[digestIndex - 1] : undefined;
    const olderDigest = digestIndex >= 0 && digestIndex < digests.length - 1 ? digests[digestIndex + 1] : undefined;
    const leadEssay = sortByDateDesc(loadEssayPosts()).find(Boolean);

    return {
      eyebrow: 'Keep going',
      title: 'Keep moving through the briefing archive',
      intro:
        digestIndex === 0
          ? 'This is the latest issue. Step back one issue for immediate context, or use the archive hub when you want to follow a repeating theme across days.'
          : 'If you are catching up, read toward the present from the newer issue first, then step back one day at a time until the pattern becomes clear.',
      contextTitle: 'Archive position',
      contextCopy:
        digestIndex >= 0
          ? `Issue ${digestIndex + 1} of ${digests.length} in the current briefing archive.`
          : 'A briefing issue inside the dated archive.',
      contextMeta: [
        digestIndex === 0 ? 'Latest published issue' : `${digestIndex} newer issue(s) available`,
        olderDigest ? 'An adjacent older issue is linked below' : 'This issue is currently the archive floor',
      ],
      items: uniqueByHref(
        [
          newerDigest ? toDigestEntry(newerDigest, 'Read the newer issue') : undefined,
          olderDigest ? toDigestEntry(olderDigest, 'Read the adjacent issue') : undefined,
          {
            kind: 'archive',
            href: '/briefing/#archive',
            label: 'Use the archive',
            title: 'Open the full briefing ledger',
            description: 'The archive page explains how to use the dated stack and gives you the full back catalog in one place.',
          },
          leadEssay
            ? toEssayEntry(
                leadEssay,
                'Step out to longform',
                'When a daily signal deserves a slower pass, switch into the essay archive for the longer editorial line.',
              )
            : undefined,
        ].filter(Boolean) as ReadingPathEntry[],
      ).slice(0, 4),
    };
  }

  const essayArchive = sortByDateDesc(loadEssayPosts());
  const threadPosts = topic ? sortByDateDesc(topicPosts.length ? topicPosts : essayArchive.filter((entry) => entry.topicSlug === post.topicSlug)) : [];
  const currentIndex = threadPosts.findIndex((entry) => entry.slug === post.slug);
  const previousPost = currentIndex > 0 ? threadPosts[currentIndex - 1] : undefined;
  const nextPost = currentIndex >= 0 && currentIndex < threadPosts.length - 1 ? threadPosts[currentIndex + 1] : undefined;
  const firstPost = sortByDateAsc(threadPosts)[0];

  const fallbackItems = essayArchive
    .filter((entry) => entry.slug !== post.slug)
    .slice(0, 2)
    .map((entry, index) =>
      toEssayEntry(
        entry,
        index === 0 ? 'Read next' : 'Another recent essay',
        'This essay stands alone, so the broader archive is the best continuation path.',
      ),
    );

  const threadItems = uniqueByHref(
    [
      firstPost && firstPost.slug !== post.slug
        ? toEssayEntry(
            firstPost,
            previousPost ? 'Step back to the origin' : 'Read the opening piece',
            'Use the first essay in the thread to recover the framing assumptions behind what you just read.',
          )
        : undefined,
      previousPost
        ? toEssayEntry(
            previousPost,
            'Read the newer follow-up',
            'This nearby essay shows how the thread tightened or shifted after the earlier pieces.',
          )
        : undefined,
      nextPost
        ? toEssayEntry(
            nextPost,
            'Read the next older piece',
            'Move one step deeper into the archive to see the adjacent argument that sits behind this essay.',
          )
        : undefined,
      topic && threadPosts.length > 1
        ? toTopicArchiveEntry(
            topic,
            `Open the full ${topic.labelEn} archive to see every essay in the thread arranged as one reading line.`,
          )
        : undefined,
    ].filter(Boolean) as ReadingPathEntry[],
  );

  const usingTopicThread = Boolean(topic && threadPosts.length > 1);
  const items = (usingTopicThread && threadItems.length ? threadItems : fallbackItems).slice(0, 4);

  return {
    eyebrow: usingTopicThread ? 'Continue the thread' : 'Continue reading',
    title: usingTopicThread ? `Continue the ${topic?.labelEn} thread` : 'Continue from the desk',
    intro: usingTopicThread
      ? `You are reading ${currentIndex + 1} of ${threadPosts.length} essays in ${topic?.labelEn}. Use the surrounding pieces to recover the whole argument, not just this slice.`
      : 'This essay works as a standalone note. The strongest continuation path is the broader writing archive rather than a single tight thread.',
    contextTitle: usingTopicThread ? 'Thread position' : 'Reading context',
    contextCopy: usingTopicThread
      ? `${currentIndex + 1} of ${threadPosts.length} essays filed under ${topic?.labelEn}.`
      : `${post.readTime} minute essay in the main writing archive.`,
    contextMeta: usingTopicThread
      ? [
          firstPost && firstPost.slug !== post.slug ? `Thread opens with ${firstPost.titleEn}` : 'This essay currently opens the thread',
          previousPost ? 'A newer follow-up is available' : 'You are on the newest piece in this thread',
        ]
      : [post.tagEn || 'Writing', `${post.readTime} min read`],
    items,
  };
}
