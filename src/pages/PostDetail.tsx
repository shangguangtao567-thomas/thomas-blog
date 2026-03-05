/**
 * PostDetail Page (static version)
 * Reads full post content from src/data/posts.json
 * Renders Markdown using marked library
 */
import { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post } from '../types';
import postsData from '../data/posts.json';
import { marked } from 'marked';

function formatDate(dateStr: string, language: string): string {
  try {
    const date = new Date(dateStr);
    if (language === 'zh') {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface PostDetailProps {
  slug: string;
  navigate: (path: string) => void;
}

export default function PostDetail({ slug, navigate }: PostDetailProps) {
  const { language } = useLanguage();
  const [renderedContent, setRenderedContent] = useState('');

  const post = (postsData as Post[]).find(p => p.slug === slug);

  useEffect(() => {
    if (!post) return;
    const rawContent = language === 'zh' ? (post.contentZh || post.contentEn || '') : (post.contentEn || '');
    const html = marked(rawContent) as string;
    setRenderedContent(html);
  }, [post, language]);

  useEffect(() => {
    if (post) {
      const title = language === 'zh' ? post.titleZh : post.titleEn;
      document.title = `${title} · Thomas's Blog`;
    }
    return () => {
      document.title = "Thomas's Blog · AI · Open Source · Vibe Coding";
    };
  }, [post, language]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">📭</p>
          <h1 className="text-2xl font-display text-foreground mb-2">
            {language === 'zh' ? '文章不存在' : 'Post not found'}
          </h1>
          <button
            onClick={() => navigate('/blog')}
            className="text-sm text-muted-foreground hover:text-foreground font-ui underline underline-offset-4"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            {language === 'zh' ? '返回博客列表' : 'Back to blog'}
          </button>
        </div>
      </div>
    );
  }

  const title = language === 'zh' ? post.titleZh : post.titleEn;
  const tag = language === 'zh' ? post.tag : post.tagEn;
  const date = formatDate(post.publishedAt, language);

  return (
    <div className="min-h-screen">
      <article className="max-w-2xl mx-auto px-6 md:px-8 pt-10 pb-20">
        {/* Back link */}
        <button
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-8 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {language === 'zh' ? '返回博客' : 'Back to Blog'}
        </button>

        {/* Cover image */}
        {post.image && (
          <div className="rounded-2xl overflow-hidden aspect-[16/7] mb-10">
            <img src={post.image} alt={title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground font-ui">
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {date}
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {post.readTime} {language === 'zh' ? '分钟阅读' : 'min read'}
          </span>
          {tag && (
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)' }}>
                {tag}
              </span>
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-display text-foreground leading-tight mb-8">{title}</h1>

        {/* Content */}
        {renderedContent ? (
          <div
            className="prose-article"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-ui text-sm">
              {language === 'zh' ? '文章内容即将发布...' : 'Article content coming soon...'}
            </p>
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-border">
          <button
            onClick={() => navigate('/blog')}
            className="inline-flex items-center gap-2 text-sm font-ui text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            {language === 'zh' ? '返回博客列表' : 'Back to all posts'}
          </button>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-10 text-center">
        <p className="text-xs text-muted-foreground font-ui">
          © 2026 Thomas. {language === 'zh' ? '版权所有' : 'All rights reserved'}.
        </p>
      </footer>
    </div>
  );
}
