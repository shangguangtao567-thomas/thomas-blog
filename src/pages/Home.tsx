/**
 * Home Page — Thomas's Personal Portal
 * Static version: reads from src/data/posts-index.json and src/data/tech-news.json
 */
import { useLanguage } from '../contexts/LanguageContext';
import type { Post, TechNewsItem } from '../types';
import postsIndex from '../data/posts-index.json';
import techNewsData from '../data/tech-news.json';

const MASCOT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp';

const tagColors: Record<string, string> = {
  'AI': 'bg-violet-100 text-violet-700',
  'Apple': 'bg-sky-100 text-sky-700',
  'Open Source': 'bg-emerald-100 text-emerald-700',
  'Infrastructure': 'bg-orange-100 text-orange-700',
  'Tools': 'bg-blue-100 text-blue-700',
  'Security': 'bg-red-100 text-red-700',
  'Web': 'bg-cyan-100 text-cyan-700',
  'Tech': 'bg-gray-100 text-gray-700',
};

interface HomeProps {
  navigate: (path: string) => void;
}

export default function Home({ navigate }: HomeProps) {
  const { language } = useLanguage();

  const posts = (postsIndex as Post[]).slice(0, 4);
  const techNews = (techNewsData as TechNewsItem[]).filter(n => n.featured).slice(0, 4);

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-5xl mx-auto">
        {/* ─── Hero: Two-column layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 mb-14">

          {/* Left: Personal intro */}
          <div className="flex flex-col gap-6">
            {/* Avatar + Name */}
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

            {/* Bio */}
            <div className="space-y-3">
              <p className="text-sm text-foreground/80 leading-relaxed font-ui" style={{ color: 'color-mix(in oklch, var(--foreground) 80%, transparent)' }}>
                {language === 'zh'
                  ? '科技爱好者，用 vibe coding 把想法变成现实。这里记录我对 AI、开源工具和技术趋势的思考。'
                  : 'Tech enthusiast, turning ideas into reality with vibe coding. This is where I document my thoughts on AI, open source tools, and tech trends.'}
              </p>
            </div>

            {/* Skills / Identity tags */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: language === 'zh' ? 'AI 探索者' : 'AI Explorer' },
                { label: 'Vibe Coder' },
                { label: language === 'zh' ? '开源爱好者' : 'Open Source' },
              ].map(({ label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium font-ui bg-secondary text-secondary-foreground border border-border"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { value: String((postsIndex as Post[]).length), label: language === 'zh' ? '篇文章' : 'Posts' },
                { value: '1+', label: language === 'zh' ? '年经验' : 'Yrs Exp' },
                { value: '∞', label: language === 'zh' ? '好奇心' : 'Curiosity' },
              ].map(({ value, label }) => (
                <div key={label} className="text-center p-2.5 rounded-xl bg-card border border-border">
                  <p className="text-lg font-bold text-foreground font-mono">{value}</p>
                  <p className="text-[10px] text-muted-foreground font-ui mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://x.com/GuangtaoS29545"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-ui bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-150"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Twitter
              </a>
              <a
                href="mailto:shangguangtao567@gmail.com"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-ui bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-150"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Email
              </a>
              <a
                href="https://github.com/GuangtaoS29545"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium font-ui bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all duration-150"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>

          {/* Right: Featured posts */}
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
              <button
                onClick={() => navigate('/blog')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {language === 'zh' ? '全部文章' : 'All posts'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-0.5 group-hover:translate-x-0.5 transition-transform">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            {/* Post list */}
            <div className="space-y-2">
              {posts.length > 0 ? (
                posts.map((post, index) => {
                  const title = language === 'zh' ? post.titleZh : post.titleEn;
                  const tag = language === 'zh' ? post.tag : post.tagEn;
                  const date = post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })
                    : '';
                  return (
                    <button
                      key={post.slug}
                      onClick={() => navigate(`/blog/${post.slug}`)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150 w-full text-left"
                      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                    >
                      <span className="text-[11px] font-mono text-muted-foreground w-5 flex-shrink-0 text-right" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 50%, transparent)' }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate font-ui">{title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">{date}</span>
                          {tag && <span className="text-[10px] text-muted-foreground font-ui">· {tag}</span>}
                        </div>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-muted-foreground group-hover:translate-x-0.5 transition-all duration-150" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 30%, transparent)' }}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm font-ui">
                  {language === 'zh' ? '暂无文章' : 'No posts yet'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Tech News Preview ─── */}
        <div className="border-t border-border pt-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                {language === 'zh' ? '// 科技热点' : '// TECH SPOTLIGHT'}
              </p>
              <h2 className="text-lg font-semibold text-foreground font-display">
                {language === 'zh' ? '值得关注的动态' : 'Worth Watching'}
              </h2>
            </div>
            <button
              onClick={() => navigate('/tech')}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui group"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {language === 'zh' ? '查看全部' : 'View all'}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-0.5 group-hover:translate-x-0.5 transition-transform">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {techNews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {techNews.map((item) => (
                <a
                  key={item.id}
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col gap-2 p-3.5 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColors[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                      {item.tag}
                    </span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }}>
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug font-ui">
                    {language === 'zh' ? item.titleZh : item.titleEn}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {item.source} · {item.publishedAt}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm font-ui">
              {language === 'zh' ? '科技热点正在加载...' : 'Tech news loading...'}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 mt-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-mono">© 2026 Thomas</p>
          <div className="flex items-center gap-5">
            {[
              { path: '/', label: language === 'zh' ? '首页' : 'Home' },
              { path: '/blog', label: language === 'zh' ? '博客' : 'Blog' },
              { path: '/tech', label: language === 'zh' ? '科技热点' : 'Tech' },
            ].map(({ path, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-ui"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
