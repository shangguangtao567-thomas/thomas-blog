import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post, TopicIndexItem } from '../types';
import postsIndex from '../data/posts-index.json';
import topicsData from '../data/topics.json';
import GrowthActions from '../components/GrowthActions';

interface TopicArchiveProps {
  slug: string;
  navigate: (path: string) => void;
}

function formatDate(dateStr: string, language: 'zh' | 'en') {
  try {
    return new Date(dateStr).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: language === 'zh' ? 'long' : 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function TopicArchive({ slug, navigate }: TopicArchiveProps) {
  const { language } = useLanguage();
  const posts = (postsIndex as Post[]).filter(post => !post.slug.startsWith('ai-daily-'));
  const topics = topicsData as TopicIndexItem[];
  const topic = topics.find(item => item.slug === slug);

  const relatedPosts = useMemo(
    () =>
      posts.filter(post => post.topicSlug === slug || post.slug === topic?.latestPostSlugs?.[0] || topic?.latestPostSlugs?.includes(post.slug)),
    [posts, slug, topic]
  );

  if (!topic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-5xl font-mono text-muted-foreground mb-4">404</p>
          <h1 className="text-2xl font-display text-foreground mb-3">
            {language === 'zh' ? '专题不存在' : 'Topic not found'}
          </h1>
          <button
            onClick={() => navigate('/blog')}
            className="text-sm text-muted-foreground hover:text-foreground font-ui underline underline-offset-4"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            {language === 'zh' ? '返回博客' : 'Back to blog'}
          </button>
        </div>
      </div>
    );
  }

  const label = language === 'zh' ? topic.labelZh : topic.labelEn;

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/blog')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-6 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          <span>{language === 'zh' ? '返回博客' : 'Back to blog'}</span>
        </button>

        <section className="rounded-[28px] border border-border bg-card p-6 md:p-8 mb-8">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground mb-3">
            {language === 'zh' ? '// TOPIC ARCHIVE' : '// TOPIC ARCHIVE'}
          </p>
          <h1 className="text-3xl md:text-4xl font-display text-foreground leading-tight mb-3">{label}</h1>
          <p className="text-sm md:text-base text-muted-foreground font-ui leading-relaxed max-w-3xl">
            {language === 'zh'
              ? `这个专题聚合了 ${topic.count} 篇内容，方便从 X 或搜索进来的读者继续沿着同一条主线往下读。`
              : `This topic archive groups ${topic.count} pieces so readers arriving from X or search can keep following the same line of thought.`}
          </p>
          <GrowthActions language={language} context={`topic_${slug}`} className="mt-5" />
        </section>

        <section className="space-y-3">
          {relatedPosts.map((post, index) => {
            const title = language === 'zh' ? post.titleZh : post.titleEn;
            const excerpt = language === 'zh' ? post.excerptZh : post.excerptEn;
            return (
              <button
                key={post.slug}
                onClick={() => navigate(`/blog/${post.slug}`)}
                className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  <span className="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] text-muted-foreground font-mono">
                      <span>{formatDate(post.publishedAt, language)}</span>
                      <span>{post.readTime} {language === 'zh' ? '分钟' : 'min'}</span>
                    </div>
                    <h2 className="text-lg font-display text-foreground mb-2">{title}</h2>
                    <p className="text-sm text-muted-foreground font-ui leading-relaxed">{excerpt}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>
      </div>
    </div>
  );
}
