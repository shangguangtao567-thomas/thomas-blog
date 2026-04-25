import type { AiDigestDetail, AiDigestIndexItem, Post, TopicIndexItem } from '../types';

export type { AiDigestDetail, AiDigestIndexItem, Post, TopicIndexItem };

export type RouteKind =
  | 'home'
  | 'blog-index'
  | 'briefing-index'
  | 'compat'
  | 'essay'
  | 'digest'
  | 'topic'
  | 'feed'
  | 'sitemap'
  | 'not-found';

export interface RouteManifestEntry {
  kind: RouteKind;
  path: string;
  canonical: string;
  title: string;
  description: string;
  robots: string;
  ogType: 'website' | 'article';
  publishedAt?: string;
  lastmod?: string;
  image?: string;
  keywords?: string[];
  sitemap: boolean;
  feed: boolean;
  noindex?: boolean;
}

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  ogType: 'website' | 'article';
  image?: string;
  publishedAt?: string;
  lastmod?: string;
  keywords?: string[];
  jsonLd?: unknown;
  alternateLinks?: Array<{ rel: string; href: string; type?: string; title?: string }>;
  refreshTo?: string;
}
