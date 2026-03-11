export interface Post {
  slug: string;
  titleZh: string;
  titleEn: string;
  excerptZh: string;
  excerptEn: string;
  tag: string;
  tagEn: string;
  image: string;
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
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  deckZh?: string;
  tag: string;
  source: string;
  sourceName?: string;
  sourceUrl: string;
  relatedLinks?: TechNewsLink[];
  takeawayBulletsZh?: string[];
  themeZh?: string;
  impactZh?: string;
  publishedAt: string;
  publishedLabelZh?: string;
  score?: number;
  featured: boolean;
}

export interface AiDigestIndexItem {
  slug: string;
  date: string;
  titleZh: string;
  titleEn: string;
  excerptZh: string;
  excerptEn: string;
  path: string;
  itemCount: number;
  heroTitleZh?: string;
  heroTitleEn?: string;
  limitedUpdateWindow?: boolean;
  featuredItems?: Array<{
    id: string;
    titleZh: string;
    titleEn: string;
    tag: string;
    summaryZh?: string;
    publishedLabelZh?: string;
  }>;
}
