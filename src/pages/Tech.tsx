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

export default function Tech({ navigate }: TechProps) {
  const { language } = useLanguage();
  const digests = digestsData as AiDigestIndexItem[];
  const items = techNewsData as TechNewsItem[];
  const xDrafts = xDraftsData as XDraftPack[];
  const latestDigest = digests[0];
  const latestDraft = xDrafts[0];

  const previewItems = useMemo(() => items.slice(0, 4), [items]);
  const archiveItems = useMemo(() => digests.slice(1), [digests]);
  const bodyCoverage = latestDigest?.bodyCoverage;
  const themes = latestDigest?.themes?.slice(0, 4) || [];

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-6xl mx-auto space-y-10">
        <section className="rounded-[32px] border border-border bg-card p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(99,102,241,0.9),rgba(16,185,129,0.8),rgba(251,191,36,0.75))]" />
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.95fr] lg:items-start">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] font-mono mb-3">
                {language === 'zh' ? '// AI 日报专栏' : '// AI DAILY COLUMN'}
              </p>
              <h1 className="text-3xl md:text-5xl font-display text-foreground leading-tight mb-4">
                {language === 'zh' ? 'AI 日报中心' : 'AI Daily Briefing Hub'}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground font-ui max-w-3xl leading-relaxed mb-5">
                {language === 'zh'
                  ? '这里不再把日报当成泛博客文章。流程现在分成三层：RSS 抓候选、高价值条目抓正文、本地规则生成中英双语 briefing。预览卡片负责让你快速扫一眼，完整解释则进入日报专栏页。'
                  : 'The digest is no longer treated like a generic blog post. The pipeline now has three layers: RSS candidates, full-body fetches for high-value items, and local rule-based bilingual briefings. Preview cards help you scan quickly; the full explanation lives in the briefing issue itself.'}
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
                  {latestDigest.limitedUpdateWindow && (
                    <span className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700">
                      {language === 'zh' ? '近 24 小时更新有限' : 'Limited last-24h updates'}
                    </span>
                  )}
                </div>
              )}
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

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                  {language === 'zh' ? '// 今日简报卡片' : '// TODAY’S BRIEFING CARDS'}
                </p>
                <h2 className="text-2xl font-display text-foreground">
                  {language === 'zh' ? '先扫重点，再打开日报正文' : 'Scan the key moves, then open the full issue'}
                </h2>
              </div>
              {latestDigest && (
                <button onClick={() => navigate(latestDigest.path)} className="text-xs font-ui text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                  {language === 'zh' ? '进入完整专栏' : 'Open full column'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {previewItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => latestDigest && navigate(latestDigest.path)}
                  className="text-left rounded-[24px] border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                        {item.tag}
                      </span>
                      {item.kickerZh && (
                        <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          {currentText(language, item.kickerZh, item.kickerEn)}
                        </p>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono text-right">
                      {currentText(language, item.publishedLabelZh, item.publishedLabelEn) || item.sourceName || item.source}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground leading-snug font-display mb-2">
                    {currentText(language, item.titleZh, item.titleEn)}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-3">
                    {currentText(language, item.deckZh || item.summaryZh, item.deckEn || item.summaryEn)}
                  </p>
                  <p className="text-xs text-foreground/85 leading-relaxed font-ui mb-3">
                    {currentText(language, item.whyItMattersZh, item.whyItMattersEn)}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-ui text-muted-foreground">
                    <span>{currentText(language, item.sourceNoteZh, item.sourceNoteEn)}</span>
                    <span>→ {language === 'zh' ? '看完整解释' : 'Open issue'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '本期方法' : 'Method'}
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground font-ui">
                <li>{language === 'zh' ? 'RSS 只负责抓候选，不直接充当最终解读。' : 'RSS only provides candidates; it is not treated as the final explanation layer.'}</li>
                <li>{language === 'zh' ? '高价值条目优先抓原文正文，再生成双语 digest。' : 'High-value items get full-body fetch priority before the bilingual digest is generated.'}</li>
                <li>{language === 'zh' ? '不足时明确写不足，不用旧消息凑数。' : 'If updates are thin, the issue says so explicitly instead of padding with older items.'}</li>
              </ul>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '为什么值得订阅' : 'Why this is useful'}
              </p>
              <p className="text-sm leading-relaxed text-foreground font-ui">
                {language === 'zh'
                  ? '如果你不想每天自己刷一堆源，这里提供的是一个“先判断，再点击”的入口：先看本地解释，再决定哪些原文值得深挖。'
                  : 'If you do not want to scan a dozen feeds yourself, this gives you a “judge first, click later” workflow: read the local explanation first, then decide which originals deserve a deeper read.'}
              </p>
            </section>

            {latestDraft && (
              <section className="rounded-[24px] border border-border bg-card p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                  {language === 'zh' ? '今日 X 草稿' : 'Today’s X draft'}
                </p>
                <p className="text-sm leading-relaxed text-foreground font-ui mb-3">
                  {language === 'zh' ? latestDraft.angleZh : latestDraft.angleEn}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground font-ui">
                  {language === 'zh' ? latestDraft.shortPostZh : latestDraft.shortPostEn}
                </p>
              </section>
            )}
          </aside>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-1">
                {language === 'zh' ? '// 往期归档' : '// ARCHIVE'}
              </p>
              <h2 className="text-2xl font-display text-foreground">
                {language === 'zh' ? '往期日报入口' : 'Past digest issues'}
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {archiveItems.length ? archiveItems.map(digest => (
              <button
                key={digest.slug}
                onClick={() => navigate(digest.path)}
                className="text-left rounded-[24px] border border-border bg-card p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <p className="text-[11px] font-mono text-muted-foreground mb-2">{digest.date}</p>
                <h3 className="text-lg font-display text-foreground mb-2">{currentText(language, digest.titleZh, digest.titleEn)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-ui mb-3">{currentText(language, digest.excerptZh, digest.excerptEn)}</p>
                {digest.themes?.length ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {digest.themes.slice(0, 2).map(theme => (
                      <span key={`${digest.slug}-${theme.themeZh}`} className="px-2 py-1 rounded-full border border-border text-[11px] font-ui text-muted-foreground">
                        {language === 'zh' ? theme.themeZh : theme.themeEn}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="text-xs font-ui text-foreground">→ {language === 'zh' ? '打开这一期' : 'Open issue'}</div>
              </button>
            )) : (
              <div className="text-sm text-muted-foreground font-ui">
                {language === 'zh' ? '目前还没有更多往期日报。' : 'No older digest issues yet.'}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
