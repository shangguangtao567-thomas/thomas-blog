import { useEffect, useMemo, useState } from 'react';
import { marked } from 'marked';
import { useLanguage } from '../contexts/LanguageContext';
import type { AiDigestDetail, AiDigestIndexItem, Post } from '../types';
import postsData from '../data/posts.json';
import digestDetailsData from '../data/ai-digest-details.json';
import digestIndexData from '../data/ai-digests.json';
import AIDigestBriefing from '../components/AIDigestBriefing';
import GrowthActions from '../components/GrowthActions';

function formatDate(dateStr: string, language: 'zh' | 'en'): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: language === 'zh' ? 'long' : 'short',
      day: 'numeric',
    });
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

  const posts = postsData as Post[];
  const post = posts.find(item => item.slug === slug);
  const digestDetail = (digestDetailsData as AiDigestDetail[]).find(item => item.slug === slug);
  const digestIndex = digestIndexData as AiDigestIndexItem[];
  const isDigest = Boolean(post && ((post.kind || '') === 'digest' || slug.startsWith('ai-daily-')));

  useEffect(() => {
    if (!post) return;
    const rawContent = language === 'zh' ? (post.contentZh || post.contentEn || '') : (post.contentEn || post.contentZh || '');
    setRenderedContent((marked(rawContent) as string) || '');
  }, [post, language]);

  useEffect(() => {
    if (!post) return;
    const title = language === 'zh'
      ? (post.seoTitleZh || post.titleZh || post.titleEn)
      : (post.seoTitleEn || post.titleEn || post.titleZh);
    document.title = `${title} · Thomas's Blog`;

    return () => {
      document.title = "Thomas's Blog · AI · Open Source · Vibe Coding";
    };
  }, [post, language]);

  const nonDigestPosts = useMemo(
    () => posts.filter(item => !item.slug.startsWith('ai-daily-')),
    [posts]
  );

  const currentIndex = nonDigestPosts.findIndex(item => item.slug === slug);
  const previousPost = currentIndex >= 0 ? nonDigestPosts[currentIndex + 1] : undefined;
  const nextPost = currentIndex > 0 ? nonDigestPosts[currentIndex - 1] : undefined;

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return nonDigestPosts
      .filter(item => item.slug !== post.slug)
      .map(item => {
        let score = 0;
        if (item.topicSlug && post.topicSlug && item.topicSlug === post.topicSlug) score += 3;
        if (item.pillar && post.pillar && item.pillar === post.pillar) score += 2;
        if (item.tagEn === post.tagEn) score += 1;
        return { item, score };
      })
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.item.publishedAt.localeCompare(a.item.publishedAt))
      .slice(0, 3)
      .map(entry => entry.item);
  }, [nonDigestPosts, post]);

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-mono font-bold text-muted-foreground mb-4">404</p>
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

  if (isDigest) {
    return (
      <AIDigestBriefing
        detail={digestDetail}
        post={post}
        archive={digestIndex}
        language={language}
        navigate={navigate}
        renderedFallbackHtml={renderedContent}
      />
    );
  }

  const title = language === 'zh' ? post.titleZh : post.titleEn;
  const excerpt = language === 'zh' ? post.excerptZh : post.excerptEn;
  const tag = language === 'zh' ? post.pillarZh || post.tag : post.pillar || post.tagEn;
  const date = formatDate(post.publishedAt, language);

  return (
    <div className="min-h-screen">
      <article className="max-w-3xl mx-auto px-6 md:px-8 pt-10 pb-20">
        <button
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-8 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {language === 'zh' ? '返回博客' : 'Back to blog'}
        </button>

        {post.image && (
          <div className="rounded-2xl overflow-hidden aspect-[16/7] mb-10">
            <img src={post.image} alt={title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-muted-foreground font-ui">
          <span>{date}</span>
          <span>{post.readTime} {language === 'zh' ? '分钟阅读' : 'min read'}</span>
          {tag && (
            <button
              onClick={() => navigate(`/topic/${post.topicSlug || ''}`)}
              className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-[10px] font-medium"
              style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)', border: 'none' }}
              disabled={!post.topicSlug}
            >
              {tag}
            </button>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-display text-foreground leading-tight mb-4">{title}</h1>
        <p className="text-base md:text-lg text-muted-foreground font-ui leading-relaxed mb-8">{excerpt}</p>

        <GrowthActions language={language} context={`post_${post.slug}`} className="mb-10" />

        {renderedContent ? (
          <div className="prose-article" dangerouslySetInnerHTML={{ __html: renderedContent }} />
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">📝</p>
            <p className="font-ui text-sm">
              {language === 'zh' ? '文章内容即将发布...' : 'Article content coming soon...'}
            </p>
          </div>
        )}

        {(previousPost || nextPost) && (
          <section className="mt-16 pt-8 border-t border-border">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-4">
              {language === 'zh' ? '// CONTINUE READING' : '// CONTINUE READING'}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {nextPost && (
                <button
                  onClick={() => navigate(`/blog/${nextPost.slug}`)}
                  className="text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <p className="text-[11px] font-mono text-muted-foreground mb-2">{language === 'zh' ? '更新的一篇' : 'Newer post'}</p>
                  <p className="text-lg font-display text-foreground mb-2">{language === 'zh' ? nextPost.titleZh : nextPost.titleEn}</p>
                  <p className="text-sm text-muted-foreground font-ui leading-relaxed">{language === 'zh' ? nextPost.excerptZh : nextPost.excerptEn}</p>
                </button>
              )}

              {previousPost && (
                <button
                  onClick={() => navigate(`/blog/${previousPost.slug}`)}
                  className="text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <p className="text-[11px] font-mono text-muted-foreground mb-2">{language === 'zh' ? '更早的一篇' : 'Older post'}</p>
                  <p className="text-lg font-display text-foreground mb-2">{language === 'zh' ? previousPost.titleZh : previousPost.titleEn}</p>
                  <p className="text-sm text-muted-foreground font-ui leading-relaxed">{language === 'zh' ? previousPost.excerptZh : previousPost.excerptEn}</p>
                </button>
              )}
            </div>
          </section>
        )}

        {relatedPosts.length > 0 && (
          <section className="mt-12 pt-8 border-t border-border">
            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-4">
              {language === 'zh' ? '// RELATED POSTS' : '// RELATED POSTS'}
            </p>
            <div className="space-y-3">
              {relatedPosts.map(item => (
                <button
                  key={item.slug}
                  onClick={() => navigate(`/blog/${item.slug}`)}
                  className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <p className="text-lg font-display text-foreground mb-2">{language === 'zh' ? item.titleZh : item.titleEn}</p>
                  <p className="text-sm text-muted-foreground font-ui leading-relaxed">{language === 'zh' ? item.excerptZh : item.excerptEn}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
