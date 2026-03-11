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

  const highlightItems = useMemo(() => items.slice(0, 3), [items]);
  const archiveItems = useMemo(() => digests.slice(1), [digests]);

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
                  ? '层级现在分开了：这里的卡片只做预览，完整解释放在日报正文里，归档只保留往期入口，不再重复当天内容。每天只收近 24 小时的新信息；如果不足，会明确说明，而不是拿旧消息凑数。'
                  : 'The hierarchy is now split cleanly: cards are previews, full explanation lives in the digest article, and the archive keeps past entries only. The pipeline keeps the last 24 hours only and explicitly says when updates are limited instead of backfilling older items.'}
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
                {latestDigest.limitedUpdateWindow && language === 'zh' && (
                  <p className="text-xs text-amber-700 font-ui mb-3">近 24 小时重点更新有限，所以没有混入更早内容。</p>
                )}
                <p className="text-xs font-ui text-foreground">→ {language === 'zh' ? '阅读最新一期' : 'Read latest issue'}</p>
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                {language === 'zh' ? '// 今日预览卡片' : '// TODAY PREVIEWS'}
              </p>
              <h2 className="text-xl font-semibold text-foreground font-display">
                {language === 'zh' ? '先知道发生了什么，再进正文看完整解释' : 'Preview what happened, then open the full digest'}
              </h2>
            </div>
            {latestDigest && (
              <button onClick={() => navigate(latestDigest.path)} className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                {language === 'zh' ? '打开日报全文' : 'Open full digest'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {highlightItems.map(item => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                    {item.tag}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">{item.publishedLabelZh || item.publishedAt}</span>
                </div>
                <h3 className="text-base font-semibold text-foreground leading-snug mb-2 font-ui">
                  {language === 'zh' ? item.titleZh : item.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-3">
                  {language === 'zh' ? item.deckZh || item.summaryZh : item.summaryEn}
                </p>
                {language === 'zh' && item.takeawayBulletsZh?.length ? (
                  <ul className="space-y-1.5 mb-4 text-xs text-muted-foreground font-ui">
                    {item.takeawayBulletsZh.slice(0, 2).map(line => (
                      <li key={line}>- {line}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {(item.relatedLinks || []).slice(0, 1).map(link => (
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
            {archiveItems.map((digest, index) => (
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
            {!archiveItems.length && (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground font-ui">
                {language === 'zh' ? '目前还没有更多往期日报。' : 'No older digest issues yet.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
