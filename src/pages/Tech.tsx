import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AiDigestIndexItem, TechNewsItem, XDraftPack } from '../types';
import digestsData from '../data/ai-digests.json';
import techNewsData from '../data/tech-news.json';
import xDraftsData from '../data/x-drafts.json';
import GrowthActions from '../components/GrowthActions';

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

function truncateText(text: string | undefined, max = 180) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

function currentText(language: 'zh' | 'en', zh?: string, en?: string) {
  return language === 'zh' ? (zh || en || '') : (en || zh || '');
}

export default function Tech({ navigate }: TechProps) {
  const { language } = useLanguage();
  const digests = digestsData as AiDigestIndexItem[];
  const items = techNewsData as TechNewsItem[];
  const drafts = xDraftsData as XDraftPack[];
  const latestDigest = digests[0];
  const latestDraft = drafts[0];

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
                  ? '这里先给你当天最该看的几条卡片，完整解释放进日报正文里。流程还是保留增长能力，但前台只留下最必要的阅读入口。'
                  : 'This page gives you the day’s highest-signal cards first, then pushes the full explanation into the digest article. The growth system still runs underneath, but the front-end keeps only the reading surfaces that matter.'}
              </p>
              <GrowthActions language={language} context="tech_hub_hero" className="mt-5" />
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
                  {truncateText(language === 'zh' ? (latestDigest.issueSummaryZh || latestDigest.excerptZh) : (latestDigest.issueSummaryEn || latestDigest.excerptEn), 180)}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] font-ui text-muted-foreground mb-3">
                  <span className="px-2.5 py-1 rounded-full border border-border bg-card">
                    {language === 'zh' ? `${latestDigest.itemCount} 条重点更新` : `${latestDigest.itemCount} items`}
                  </span>
                  {latestDigest.bodyCoverage && (
                    <span className="px-2.5 py-1 rounded-full border border-border bg-card">
                      {language === 'zh'
                        ? `正文 ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}`
                        : `Bodies ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}`}
                    </span>
                  )}
                </div>
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
              <button
                onClick={() => navigate(latestDigest.path)}
                className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
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
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {language === 'zh' ? item.publishedLabelZh || item.publishedAt : item.publishedLabelEn || item.publishedAt}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-foreground leading-snug mb-2 font-ui">
                  {language === 'zh' ? item.titleZh : item.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-3">
                  {truncateText(language === 'zh' ? item.deckZh || item.summaryZh : item.deckEn || item.summaryEn, 150)}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground font-ui">
                    {truncateText(currentText(language, item.whyItMattersZh, item.whyItMattersEn), 70)}
                  </p>
                  <span className="text-xs text-foreground font-ui flex-shrink-0">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {latestDraft && (
          <section className="rounded-[24px] border border-border bg-card p-5 md:p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                  {language === 'zh' ? '// 今日 X 角度' : '// TODAY’S X ANGLE'}
                </p>
                <h2 className="text-lg font-semibold text-foreground font-display">
                  {language === 'zh' ? '已经准备好，但不抢正文的位置' : 'Prepared for distribution, but not stealing the page'}
                </h2>
              </div>
              {latestDigest && (
                <button
                  onClick={() => navigate(latestDigest.path)}
                  className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  {language === 'zh' ? '回到这期日报' : 'Back to this issue'}
                </button>
              )}
            </div>
            <p className="text-sm text-foreground font-ui leading-relaxed mb-3">
              {language === 'zh' ? latestDraft.angleZh : latestDraft.angleEn}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {(language === 'zh' ? latestDraft.hooksZh : latestDraft.hooksEn).slice(0, 2).map(hook => (
                <div key={hook} className="rounded-xl border border-border bg-background/60 p-3 text-sm text-muted-foreground font-ui leading-relaxed">
                  {truncateText(hook, 140)}
                </div>
              ))}
            </div>
          </section>
        )}

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
                      {truncateText(language === 'zh' ? digest.excerptZh : digest.excerptEn, 180)}
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
