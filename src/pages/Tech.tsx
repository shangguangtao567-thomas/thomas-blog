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

function currentText(language: 'zh' | 'en', zh?: string, en?: string) {
  return language === 'zh' ? (zh || en || '') : (en || zh || '');
}

function truncateText(text: string | undefined, max = 180) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

export default function Tech({ navigate }: TechProps) {
  const { language } = useLanguage();
  const digests = digestsData as AiDigestIndexItem[];
  const items = techNewsData as TechNewsItem[];
  const xDrafts = xDraftsData as XDraftPack[];
  const latestDigest = digests[0];
  const latestDraft = xDrafts[0];

  const previewItems = useMemo(() => items.slice(0, 6), [items]);
  const archiveItems = useMemo(() => digests.slice(1), [digests]);
  const bodyCoverage = latestDigest?.bodyCoverage;
  const themes = latestDigest?.themes?.slice(0, 4) || [];

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-6xl mx-auto space-y-8">
        <section className="rounded-[32px] border border-border bg-card p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(99,102,241,0.9),rgba(16,185,129,0.8),rgba(251,191,36,0.75))]" />
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] xl:items-start">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] font-mono mb-3">
                {language === 'zh' ? '// AI 日报专栏' : '// AI DAILY COLUMN'}
              </p>
              <h1 className="text-3xl md:text-5xl font-display text-foreground leading-tight mb-4">
                {language === 'zh' ? 'AI 日报中心' : 'AI Daily Briefing Hub'}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground font-ui max-w-3xl leading-relaxed mb-5">
                {language === 'zh'
                  ? '这里的重点不是“新闻越多越好”，而是把当天最值得跟进的几条信号压成一条可读、可引用、可继续分发的主线。'
                  : 'The goal here is not volume. It is to compress the highest-signal updates of the day into one line of thought that is readable, citable, and easy to distribute further.'}
              </p>
              {latestDigest && (
                <div className="flex flex-wrap gap-2 text-xs font-ui text-muted-foreground mb-4">
                  <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">{latestDigest.date}</span>
                  <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">
                    {language === 'zh' ? `${latestDigest.itemCount} 条高价值更新` : `${latestDigest.itemCount} high-signal items`}
                  </span>
                  {bodyCoverage && (
                    <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">
                      {language === 'zh'
                        ? `正文覆盖 ${bodyCoverage.succeeded}/${bodyCoverage.targeted || latestDigest.itemCount}`
                        : `Full-body coverage ${bodyCoverage.succeeded}/${bodyCoverage.targeted || latestDigest.itemCount}`}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {latestDigest && (
                  <button
                    onClick={() => navigate(latestDigest.path)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-foreground text-background text-sm font-ui hover:opacity-90 transition-opacity"
                    style={{ background: 'var(--foreground)', color: 'var(--background)', border: 'none' }}
                  >
                    {language === 'zh' ? '阅读最新一期日报' : 'Read latest issue'}
                    <span>→</span>
                  </button>
                )}
                <button
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border text-sm font-ui text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  style={{ background: 'none' }}
                >
                  {language === 'zh' ? '回到首页' : 'Back home'}
                </button>
              </div>
              <GrowthActions language={language} context="tech_hub_hero" className="mt-4" />
            </div>

            <div className="rounded-[24px] border border-border bg-background/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  {language === 'zh' ? '本期摘要' : 'Issue summary'}
                </p>
                <p className="text-sm leading-relaxed text-foreground font-ui">
                  {currentText(language, latestDigest?.issueSummaryZh || latestDigest?.excerptZh, latestDigest?.issueSummaryEn || latestDigest?.excerptEn)}
                </p>
              </div>
              {!!themes.length && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    {language === 'zh' ? '主线主题' : 'Themes'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {themes.map(theme => (
                      <span key={`${theme.themeZh}-${theme.count}`} className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-ui text-foreground">
                        {language === 'zh' ? theme.themeZh : theme.themeEn} · {theme.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                  {language === 'zh' ? '// 今日重点' : '// TODAY\'S PRIORITIES'}
                </p>
                <h2 className="text-2xl font-display text-foreground">
                  {language === 'zh' ? '先扫重点，再进完整日报' : 'Scan the priorities, then open the full issue'}
                </h2>
              </div>
              {latestDigest && (
                <button
                  onClick={() => navigate(latestDigest.path)}
                  className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  {language === 'zh' ? '进入完整专栏' : 'Open full column'}
                </button>
              )}
            </div>

            {previewItems.map(item => (
              <button
                key={item.id}
                onClick={() => latestDigest && navigate(latestDigest.path)}
                className="w-full text-left rounded-[28px] border border-border bg-card p-5 md:p-6 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-muted-foreground">#{String(item.rank || 0).padStart(2, '0')}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                      {item.tag}
                    </span>
                    {item.kickerZh && (
                      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                        {currentText(language, item.kickerZh, item.kickerEn)}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {currentText(language, item.publishedLabelZh, item.publishedLabelEn) || item.sourceName || item.source}
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-display text-foreground leading-snug mb-3">
                  {currentText(language, item.titleZh, item.titleEn)}
                </h3>

                <div className="grid gap-4 md:grid-cols-[1fr_0.9fr]">
                  <div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-3">
                      {truncateText(currentText(language, item.deckZh || item.summaryZh, item.deckEn || item.summaryEn), 170)}
                    </p>
                    <p className="text-sm text-foreground/85 leading-relaxed font-ui">
                      {currentText(language, item.whyItMattersZh, item.whyItMattersEn)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground mb-2">
                      {language === 'zh' ? '来源判断' : 'Source note'}
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground font-ui mb-3">
                      {currentText(language, item.sourceNoteZh, item.sourceNoteEn)}
                    </p>
                    <p className="text-xs font-ui text-foreground">
                      → {language === 'zh' ? '看完整解释' : 'Open issue'}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
            {latestDraft && (
              <section className="rounded-[24px] border border-border bg-card p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  {language === 'zh' ? '今日 X 草稿' : 'Today’s X draft'}
                </p>
                <p className="text-sm leading-relaxed text-foreground font-ui mb-3">
                  {language === 'zh' ? latestDraft.angleZh : latestDraft.angleEn}
                </p>
                <div className="space-y-2 mb-3">
                  {(language === 'zh' ? latestDraft.hooksZh : latestDraft.hooksEn).slice(0, 2).map(hook => (
                    <p key={hook} className="text-xs leading-relaxed text-muted-foreground font-ui">{truncateText(hook, 110)}</p>
                  ))}
                </div>
                <button
                  onClick={() => latestDigest && navigate(latestDigest.path)}
                  className="text-xs font-ui text-foreground hover:opacity-75 transition-opacity"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  {language === 'zh' ? '回到今天这期日报' : 'Open today’s digest'}
                </button>
              </section>
            )}

            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '方法' : 'Method'}
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground font-ui">
                <li>{language === 'zh' ? 'RSS 只负责抓候选，不直接充当最终解读。' : 'RSS only provides candidates, not the final explanation.'}</li>
                <li>{language === 'zh' ? '高价值条目优先抓原文正文，再生成双语 digest。' : 'High-value items get full-body fetch priority before the bilingual digest is generated.'}</li>
                <li>{language === 'zh' ? '更新不够多时，明确写不足，不用旧消息凑数。' : 'If updates are thin, the issue says so instead of padding with older items.'}</li>
              </ul>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '往期归档' : 'Archive'}
              </p>
              <div className="space-y-3">
                {archiveItems.length ? archiveItems.map(digest => (
                  <button
                    key={digest.slug}
                    onClick={() => navigate(digest.path)}
                    className="block w-full text-left pb-3 border-b border-border last:border-b-0 last:pb-0"
                    style={{ background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', paddingInline: 0 }}
                  >
                    <p className="text-[11px] font-mono text-muted-foreground mb-1">{digest.date}</p>
                    <p className="text-sm font-medium text-foreground font-ui mb-1">{currentText(language, digest.titleZh, digest.titleEn)}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground font-ui">
                      {truncateText(currentText(language, digest.excerptZh, digest.excerptEn), 88)}
                    </p>
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground font-ui">
                    {language === 'zh' ? '目前还没有更多往期日报。' : 'No older digest issues yet.'}
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
