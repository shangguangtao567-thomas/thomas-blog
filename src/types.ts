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

export interface TechNewsItem {
  id: number;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  tag: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  score?: number;
  featured: boolean;
}
