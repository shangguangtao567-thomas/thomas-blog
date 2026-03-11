import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AiDigestIndexItem, TechNewsItem } from '../types';
import digestsData from '../data/ai-digests.json';
import techNewsData from '../data/tech-news.json';

interface TechProps {
  navigate: (path: string) => void;
}

const tagColorMap: Record<string, string> = {
  AI: 'bg-violet-100 text-violet-700',
  'Open Source': 'bg-emerald-100 text-emerald-700',
  Infrastructure: 'bg-orange-100 text-orange-700',
  Tools: 'bg-blue-100 text-blue-700',
  Security: 'bg-red-100 text-red-700',
  Data: 'bg-yellow-100 text-yellow-700',
  Tech: 'bg-gray-100 text-gray-700',
};

export default function Tech({ navigate }: TechProps) {
  const { language } = useLanguage();
  const digests = digestsData as AiDigestIndexItem[];
  const items = techNewsData as TechNewsItem[];
  const latestDigest = digests[0];

  const featuredItems = useMemo(() => items.slice(0, 6), [items]);

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-5xl mx-auto space-y-10">
        <section className="rounded-[28px] border border-border bg-card p-6 md:p-8">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] font-mono mb-3">
            {language === 'zh' ? '// AI 日报系统' : '// AI DAILY SYSTEM'}
          </p>
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground font-display mb-4">
                {language === 'zh' ? '站内 AI 日报' : 'On-site AI Daily Briefing'}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground font-ui max-w-2xl leading-relaxed">
                {language === 'zh'
                  ? '每天从 AI RSS 信号流里挑出最值得看的几条，先在站内整理成可读的日报文章，再附来源链接供继续深挖。主阅读体验留在博客里，不把用户直接甩去外站。'
                  : 'Each day the site turns high-signal AI RSS items into an on-site briefing post first, then keeps source links as supporting references instead of making outbound clicks the default experience.'}
              </p>
            </div>
            {latestDigest && (
              <button
                onClick={() => navigate(latestDigest.path)}
                className="text-left rounded-2xl border border-border bg-background/60 p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <p className="text-[11px] font-mono text-muted-foreground mb-2">{latestDigest.date}</p>
                <h2 className="text-lg font-semibold text-foreground font-display mb-2">
                  {language === 'zh' ? latestDigest.titleZh : latestDigest.titleEn}
                </h2>
                <p className="text-sm text-muted-foreground font-ui leading-relaxed mb-3">
                  {language === 'zh' ? latestDigest.excerptZh : latestDigest.excerptEn}
                </p>
                <p className="text-xs font-ui text-foreground">→ {language === 'zh' ? '阅读最新一期' : 'Read latest issue'}</p>
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                {language === 'zh' ? '// 今日摘要卡片' : '// TODAY HIGHLIGHTS'}
              </p>
              <h2 className="text-xl font-semibold text-foreground font-display">
                {language === 'zh' ? '今天站内先读这几条' : 'Read these on-site first'}
              </h2>
            </div>
            {latestDigest && (
              <button onClick={() => navigate(latestDigest.path)} className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                {language === 'zh' ? '打开日报全文' : 'Open full digest'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredItems.map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                    {item.tag}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">{item.publishedAt}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground leading-snug mb-2 font-ui">
                  {language === 'zh' ? item.titleZh : item.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-4">
                  {language === 'zh' ? item.summaryZh : item.summaryEn}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(item.relatedLinks || []).slice(0, 2).map(link => (
                    <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs font-ui px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors">
                      {language === 'zh' ? link.labelZh : link.labelEn}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-3">
            {language === 'zh' ? '// 往期日报' : '// ARCHIVE'}
          </p>
          <div className="space-y-3">
            {digests.map((digest, index) => (
              <button
                key={digest.slug}
                onClick={() => navigate(digest.path)}
                className="w-full text-left rounded-2xl border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4 md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-mono text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">{digest.date}</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground font-ui mb-2">
                      {language === 'zh' ? digest.titleZh : digest.titleEn}
                    </h3>
                    <p className="text-sm text-muted-foreground font-ui leading-relaxed">
                      {language === 'zh' ? digest.excerptZh : digest.excerptEn}
                    </p>
                  </div>
                  <div className="md:text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground font-mono mb-2">{digest.itemCount} items</p>
                    <p className="text-xs text-foreground font-ui">→ {language === 'zh' ? '进入正文' : 'Open digest'}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
