import { useLanguage } from '../contexts/LanguageContext';
import type { AiDigestIndexItem, Post, TechNewsItem } from '../types';
import postsIndex from '../data/posts-index.json';
import techNewsData from '../data/tech-news.json';
import digestsData from '../data/ai-digests.json';

const MASCOT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp';

const tagColors: Record<string, string> = {
  AI: 'bg-violet-100 text-violet-700',
  'Open Source': 'bg-emerald-100 text-emerald-700',
  Infrastructure: 'bg-orange-100 text-orange-700',
  Tools: 'bg-blue-100 text-blue-700',
  Security: 'bg-red-100 text-red-700',
  Data: 'bg-yellow-100 text-yellow-700',
  Web: 'bg-cyan-100 text-cyan-700',
  Tech: 'bg-gray-100 text-gray-700',
};

interface HomeProps {
  navigate: (path: string) => void;
}

export default function Home({ navigate }: HomeProps) {
  const { language } = useLanguage();

  const posts = (postsIndex as Post[]).filter(post => !post.slug.startsWith('ai-daily-')).slice(0, 4);
  const techNews = (techNewsData as TechNewsItem[]).slice(0, 3);
  const latestDigest = (digestsData as AiDigestIndexItem[])[0];

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 mb-14">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-border bg-card">
                  <img src={MASCOT_URL} alt="Thomas mascot" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground font-display">Thomas</h1>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">@GuangtaoS29545</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-foreground/80 leading-relaxed font-ui" style={{ color: 'color-mix(in oklch, var(--foreground) 80%, transparent)' }}>
                {language === 'zh'
                  ? '科技爱好者，用 vibe coding 把想法变成现实。这里记录我对 AI、开源工具和技术趋势的思考。'
                  : 'Tech enthusiast, turning ideas into reality with vibe coding. This is where I document my thoughts on AI, open source tools, and tech trends.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: language === 'zh' ? 'AI 探索者' : 'AI Explorer' },
                { label: 'Vibe Coder' },
                { label: language === 'zh' ? '开源爱好者' : 'Open Source' },
              ].map(({ label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-ui bg-secondary text-secondary-foreground border border-border">
                  {label}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { value: String(posts.length), label: language === 'zh' ? '篇文章' : 'Posts' },
                { value: String((digestsData as AiDigestIndexItem[]).length), label: language === 'zh' ? '期日报' : 'Digests' },
                { value: '∞', label: language === 'zh' ? '好奇心' : 'Curiosity' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-lg font-bold text-foreground font-mono">{value}</p>
                  <p className="text-[10px] text-muted-foreground font-ui mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                  {language === 'zh' ? '// 最新文章' : '// LATEST POSTS'}
                </p>
                <h2 className="text-lg font-semibold text-foreground font-display">
                  {language === 'zh' ? '近期写了什么' : 'Recent Writing'}
                </h2>
              </div>
              <button onClick={() => navigate('/blog')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group" style={{ background: 'none', border: 'none', padding: 0 }}>
                {language === 'zh' ? '全部文章' : 'All posts'}
              </button>
            </div>

            <div className="space-y-2">
              {posts.map((post, index) => {
                const title = language === 'zh' ? post.titleZh : post.titleEn;
                const tag = language === 'zh' ? post.tag : post.tagEn;
                const date = post.publishedAt
                  ? new Date(post.publishedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
                  : '';
                return (
                  <button key={post.slug} onClick={() => navigate(`/blog/${post.slug}`)} className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150 w-full text-left">
                    <span className="text-[11px] font-mono text-muted-foreground w-5 flex-shrink-0 text-right" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 50%, transparent)' }}>{String(index + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate font-ui">{title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">{date}</span>
                        {tag && <span className="text-[10px] text-muted-foreground font-ui">· {tag}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-10 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                {language === 'zh' ? '// AI 日报' : '// AI DAILY'}
              </p>
              <h2 className="text-lg font-semibold text-foreground font-display">
                {language === 'zh' ? '先看完整日报，再决定要不要深挖来源' : 'Read the full digest first, then open sources'}
              </h2>
            </div>
            <button onClick={() => navigate('/tech')} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group" style={{ background: 'none', border: 'none', padding: 0 }}>
              {language === 'zh' ? '进入日报中心' : 'Open digest hub'}
            </button>
          </div>

          {latestDigest && (
            <button onClick={() => navigate(latestDigest.path)} className="w-full text-left rounded-[24px] border border-border bg-card p-6 hover:border-foreground/20 hover:shadow-sm transition-all">
              <p className="text-[11px] font-mono text-muted-foreground mb-2">{latestDigest.date}</p>
              <h3 className="text-2xl font-display font-semibold text-foreground mb-3">
                {language === 'zh' ? latestDigest.titleZh : latestDigest.titleEn}
              </h3>
              <p className="text-sm text-muted-foreground font-ui leading-relaxed mb-3 max-w-3xl">
                {language === 'zh' ? latestDigest.excerptZh : latestDigest.excerptEn}
              </p>
              {latestDigest.limitedUpdateWindow && language === 'zh' && (
                <p className="text-xs text-amber-700 font-ui mb-4">近 24 小时重点更新有限，这期没有混入更早内容。</p>
              )}
              <p className="text-xs font-ui text-foreground">→ {language === 'zh' ? '阅读完整日报' : 'Read full digest'}</p>
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {techNews.map(item => (
              <div key={item.id} className="group flex flex-col gap-2 p-4 rounded-xl bg-card border border-border">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColors[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                    {item.tag}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">{item.publishedLabelZh || item.source}</span>
                </div>
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug font-ui">
                  {language === 'zh' ? item.titleZh : item.titleEn}
                </p>
                <p className="text-xs text-muted-foreground font-ui line-clamp-4">
                  {language === 'zh' ? item.deckZh || item.summaryZh : item.summaryEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
