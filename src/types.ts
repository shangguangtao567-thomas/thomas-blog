export interface Post {
  slug: string;
  kind?: string;
  titleZh: string;
  titleEn: string;
  seoTitleZh?: string;
  seoTitleEn?: string;
  excerptZh: string;
  excerptEn: string;
  keywords?: string[];
  pillar?: string;
  pillarZh?: string;
  topicSlug?: string;
  featured?: boolean;
  xHookZh?: string;
  xHookEn?: string;
  tag: string;
  tagEn: string;
  image: string;
  hideHero?: boolean;
  readTime: number;
  publishedAt: string;
  contentEn?: string;
  contentZh?: string;
}

export interface TechNewsLink {
  labelZh: string;
  labelEn: string;
  url: string;
}

export interface TechNewsItem {
  id: string;
  rank?: number;
  sectionLabelZh?: string;
  sectionLabelEn?: string;
  titleZh: string;
  titleEn: string;
  briefTitleZh?: string;
  briefTitleEn?: string;
  kickerZh?: string;
  kickerEn?: string;
  summaryZh: string;
  summaryEn: string;
  deckZh?: string;
  deckEn?: string;
  narrativeZh?: string[];
  narrativeEn?: string[];
  whatChangedZh?: string;
  whatChangedEn?: string;
  whyItMattersZh?: string;
  whyItMattersEn?: string;
  watchNextZh?: string;
  watchNextEn?: string;
  tag: string;
  source: string;
  sourceName?: string;
  sourceUrl: string;
  relatedLinks?: TechNewsLink[];
  takeawayBulletsZh?: string[];
  takeawayBulletsEn?: string[];
  evidenceBulletsZh?: string[];
  evidenceBulletsEn?: string[];
  themeZh?: string;
  themeEn?: string;
  impactZh?: string;
  impactEn?: string;
  publishedAt: string;
  publishedLabelZh?: string;
  publishedLabelEn?: string;
  score?: number;
  featured: boolean;
  bodyFetched?: boolean;
  bodyFetchTargeted?: boolean;
  bodyFetchStatus?: string;
  bodyWordCount?: number;
  bodySummary?: string;
  sourceNoteZh?: string;
  sourceNoteEn?: string;
}

export interface DigestThemeCount {
  themeZh: string;
  themeEn: string;
  count: number;
}

export interface DigestBodyCoverage {
  targeted: number;
  succeeded: number;
  totalWords?: number;
  ratio: number;
}

export interface AiDigestIndexItem {
  slug: string;
  date: string;
  titleZh: string;
  titleEn: string;
  excerptZh: string;
  excerptEn: string;
  issueSummaryZh?: string;
  issueSummaryEn?: string;
  path: string;
  itemCount: number;
  heroTitleZh?: string;
  heroTitleEn?: string;
  limitedUpdateWindow?: boolean;
  bodyCoverage?: DigestBodyCoverage;
  themes?: DigestThemeCount[];
  featuredItems?: Array<{
    id: string;
    titleZh: string;
    titleEn: string;
    tag: string;
    summaryZh?: string;
    summaryEn?: string;
    whyItMattersZh?: string;
    whyItMattersEn?: string;
    publishedLabelZh?: string;
    publishedLabelEn?: string;
  }>;
}

export interface AiDigestDetail extends AiDigestIndexItem {
  digestUrl: string;
  generatedAt: string;
  windowHours: number;
  introZh: string;
  introEn: string;
  methodologyZh: string;
  methodologyEn: string;
  items: TechNewsItem[];
}

export interface TopicIndexItem {
  slug: string;
  labelZh: string;
  labelEn: string;
  count: number;
  latestPostSlugs: string[];
}

export interface XDraftPack {
  date: string;
  slug: string;
  digestSlug: string;
  digestPath: string;
  angleZh: string;
  angleEn: string;
  hooksZh: string[];
  hooksEn: string[];
  shortPostZh: string;
  shortPostEn: string;
  threadZh: string[];
  threadEn: string[];
  ctaUrl: string;
  ctaLabelZh: string;
  ctaLabelEn: string;
  reviewPath: string;
}

export interface WeeklyContentOpportunity {
  id: string;
  themeZh: string;
  themeEn: string;
  score: number;
  rationaleZh: string;
  rationaleEn: string;
  proposedTitleZh: string;
  proposedTitleEn: string;
  relatedDigestSlugs: string[];
}
