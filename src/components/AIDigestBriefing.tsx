import type { AiDigestDetail, AiDigestIndexItem, Post, TechNewsItem, XDraftPack } from '../types';
import GrowthActions from './GrowthActions';
import xDraftsData from '../data/x-drafts.json';

interface AIDigestBriefingProps {
  detail?: AiDigestDetail;
  post: Post;
  archive: AiDigestIndexItem[];
  language: 'zh' | 'en';
  navigate: (path: string) => void;
  renderedFallbackHtml: string;
}

function formatDate(dateStr: string, language: 'zh' | 'en') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: language === 'zh' ? 'long' : 'short',
    day: 'numeric',
  });
}

function currentText(language: 'zh' | 'en', zh?: string, en?: string) {
  return language === 'zh' ? (zh || en || '') : (en || zh || '');
}

function renderItem(item: TechNewsItem, language: 'zh' | 'en') {
  const title = currentText(language, item.briefTitleZh || item.titleZh, item.briefTitleEn || item.titleEn);
  const sectionLabel = currentText(language, item.sectionLabelZh, item.sectionLabelEn);
  const kicker = currentText(language, item.kickerZh, item.kickerEn);
  const summary = currentText(language, item.summaryZh, item.summaryEn);
  const narrative = language === 'zh' ? item.narrativeZh : item.narrativeEn;
  const publishedLabel = currentText(language, item.publishedLabelZh, item.publishedLabelEn);

  return (
    <article key={item.id} className="rounded-[28px] border border-border bg-card p-6 md:p-8 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-[0.12em]">
          <span>#{String(item.rank || 0).padStart(2, '0')}</span>
          {sectionLabel && (
            <>
              <span>•</span>
              <span>{sectionLabel}</span>
            </>
          )}
          {kicker && (
            <>
              <span>•</span>
              <span>{kicker}</span>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground font-ui">
          <span>{item.sourceName || item.source}</span>
          {publishedLabel && <span>· {publishedLabel}</span>}
        </div>
      </div>

      <h2 className="text-2xl md:text-[1.9rem] leading-tight font-display text-foreground mb-3">{title}</h2>
      <p className="text-base leading-relaxed text-foreground/90 font-ui mb-5">{summary}</p>

      <div className="space-y-4 mb-5">
        {(narrative || []).map(line => (
          <p key={line} className="text-[15px] md:text-base leading-8 text-foreground font-ui">{line}</p>
        ))}
      </div>

      <div className="pt-4 border-t border-border flex flex-wrap gap-x-4 gap-y-2 text-sm font-ui text-muted-foreground">
        {(item.relatedLinks || []).map(link => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground transition-colors">
            {currentText(language, link.labelZh, link.labelEn)}
          </a>
        ))}
      </div>
    </article>
  );
}

export default function AIDigestBriefing({ detail, post, archive, language, navigate, renderedFallbackHtml }: AIDigestBriefingProps) {
  const title = currentText(language, detail?.titleZh || post.titleZh, detail?.titleEn || post.titleEn);
  const issueSummary = currentText(language, detail?.issueSummaryZh || post.excerptZh, detail?.issueSummaryEn || post.excerptEn);
  const bodyCoverageLabel = detail?.bodyCoverage
    ? (language === 'zh'
      ? `已补充正文 ${detail.bodyCoverage.succeeded}/${detail.bodyCoverage.targeted || detail.itemCount}`
      : `Full articles added ${detail.bodyCoverage.succeeded}/${detail.bodyCoverage.targeted || detail.itemCount}`)
    : '';
  const date = formatDate(detail?.date || post.publishedAt, language);
  const topThemes = (detail?.themes || []).slice(0, 4);
  const items = detail?.items || [];
  const archiveItems = archive.filter(item => item.slug !== detail?.slug).slice(0, 5);
  const draftPacks = xDraftsData as XDraftPack[];
  const relatedDraft = draftPacks.find(item => item.digestSlug === detail?.slug || item.digestSlug === post.slug) || draftPacks[0];

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 md:px-8 pt-8 pb-20">
        <button
          onClick={() => navigate('/tech')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-ui mb-6 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          {language === 'zh' ? '返回 AI 日报中心' : 'Back to digest hub'}
        </button>

        <section className="rounded-[32px] border border-border bg-card p-6 md:p-8 mb-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgba(99,102,241,0.9),rgba(16,185,129,0.8),rgba(251,191,36,0.75))]" />
          <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-3">
                {language === 'zh' ? '// AI DAILY BRIEFING' : '// AI DAILY BRIEFING'}
              </p>
              <h1 className="text-3xl md:text-5xl leading-tight font-display text-foreground mb-4">{title}</h1>
              <p className="text-base md:text-lg leading-relaxed text-muted-foreground font-ui max-w-3xl mb-5">{issueSummary}</p>
              <div className="flex flex-wrap gap-2 text-xs font-ui text-muted-foreground">
                <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">{date}</span>
                <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">
                  {language === 'zh' ? `${detail?.itemCount || 0} 条重点更新` : `${detail?.itemCount || 0} highlighted items`}
                </span>
                {bodyCoverageLabel && (
                  <span className="px-3 py-1.5 rounded-full border border-border bg-background/70">{bodyCoverageLabel}</span>
                )}
                {detail?.limitedUpdateWindow && (
                  <span className="px-3 py-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-700">
                    {language === 'zh' ? '未回填更早内容' : 'No backfilled older items'}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-background/70 p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '今天怎么读' : 'How to read this issue'}
              </p>
              <p className="text-sm leading-relaxed text-foreground font-ui mb-4">
                {language === 'zh'
                  ? '先读上面的导语，再顺着主线往下看；每条都尽量回答三件事：发生了什么、为什么值得关注、它和最近趋势怎么连起来。'
                  : 'Start with the lead, then follow the threads downward. Each entry is written to answer three things quickly: what happened, why it matters, and how it connects to the recent arc.'}
              </p>
              {!!topThemes.length && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    {language === 'zh' ? '今日主线' : 'Main threads'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topThemes.map(theme => (
                      <span key={`${theme.themeZh}-${theme.count}`} className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-ui text-foreground">
                        {language === 'zh' ? theme.themeZh : theme.themeEn} · {theme.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <GrowthActions language={language} context={`digest_${post.slug}_hero`} className="mt-5" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '阅读提示' : 'Reading lens'}
              </p>
              <ul className="space-y-2 text-sm leading-relaxed text-foreground font-ui">
                <li>{language === 'zh' ? '先看导语，它负责把当天几条消息串成一条线。' : 'Start with the lead; it connects the day’s items into one line of thought.'}</li>
                <li>{language === 'zh' ? '每条先给理解，再给链接；正文不再堆过程说明。' : 'Each entry gives interpretation first and links second; the body is no longer a process dump.'}</li>
                <li>{language === 'zh' ? '如果只读前三条，也能抓到当天最重要的方向。' : 'If you only read the first three entries, you should still catch the day’s main direction.'}</li>
              </ul>
            </section>

            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {language === 'zh' ? '快速跳转' : 'Quick links'}
              </p>
              <div className="space-y-2 text-sm font-ui">
                <button onClick={() => navigate('/tech')} className="block text-left text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                  {language === 'zh' ? '打开日报中心' : 'Open digest hub'}
                </button>
                <button onClick={() => navigate('/')} className="block text-left text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                  {language === 'zh' ? '回到首页' : 'Back home'}
                </button>
                <button onClick={() => navigate('/blog')} className="block text-left text-muted-foreground hover:text-foreground transition-colors" style={{ background: 'none', border: 'none', padding: 0 }}>
                  {language === 'zh' ? '全部文章' : 'All posts'}
                </button>
              </div>
            </section>
          </aside>

          <main className="space-y-5">
            {items.length > 0 ? (
              items.map(item => renderItem(item, language))
            ) : renderedFallbackHtml ? (
              <article className="rounded-[28px] border border-border bg-card p-6 md:p-8">
                <div className="prose-article digest-prose" dangerouslySetInnerHTML={{ __html: renderedFallbackHtml }} />
              </article>
            ) : (
              <article className="rounded-[28px] border border-border bg-card p-6 md:p-8 text-center text-muted-foreground font-ui">
                {language === 'zh' ? '这一期暂时没有可展开的条目。' : 'There are no expandable items in this issue yet.'}
              </article>
            )}
          </main>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {detail?.featuredItems?.length ? (
              <section className="rounded-[24px] border border-border bg-card p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">
                  {language === 'zh' ? '今日最该看' : 'Best entry points'}
                </p>
                <div className="space-y-3">
                  {detail.featuredItems.map(item => (
                    <div key={item.id} className="pb-3 border-b border-border last:border-b-0 last:pb-0">
                      <p className="text-sm font-medium text-foreground font-ui mb-1">{currentText(language, item.titleZh, item.titleEn)}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground font-ui">{currentText(language, item.whyItMattersZh || item.summaryZh, item.whyItMattersEn || item.summaryEn)}</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedDraft ? (
              <section className="rounded-[24px] border border-border bg-card p-5">
                <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">
                  {language === 'zh' ? '今日 X 草稿' : 'Today’s X draft'}
                </p>
                <p className="text-sm leading-relaxed text-foreground font-ui mb-3">
                  {language === 'zh' ? relatedDraft.angleZh : relatedDraft.angleEn}
                </p>
                <div className="space-y-2">
                  {(language === 'zh' ? relatedDraft.hooksZh : relatedDraft.hooksEn).slice(0, 2).map(hook => (
                    <p key={hook} className="text-xs leading-relaxed text-muted-foreground font-ui">{hook}</p>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[24px] border border-border bg-card p-5">
              <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-3">
                {language === 'zh' ? '往期日报' : 'Archive'}
              </p>
              <div className="space-y-3">
                {archiveItems.length ? archiveItems.map(item => (
                  <button
                    key={item.slug}
                    onClick={() => navigate(item.path)}
                    className="block w-full text-left pb-3 border-b border-border last:border-b-0 last:pb-0"
                    style={{ background: 'none', borderLeft: 'none', borderRight: 'none', borderTop: 'none', paddingInline: 0 }}
                  >
                    <p className="text-[11px] font-mono text-muted-foreground mb-1">{item.date}</p>
                    <p className="text-sm font-medium text-foreground font-ui mb-1">{currentText(language, item.titleZh, item.titleEn)}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground font-ui">{currentText(language, item.excerptZh, item.excerptEn)}</p>
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground font-ui">{language === 'zh' ? '暂无更多往期日报。' : 'No older digest issues yet.'}</p>
                )}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-10 rounded-[28px] border border-border bg-card p-6 md:p-8">
          <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
            {language === 'zh' ? '// DISTRIBUTION LOOP' : '// DISTRIBUTION LOOP'}
          </p>
          <h2 className="text-2xl font-display text-foreground mb-3">
            {language === 'zh' ? '看完日报之后的下一步' : 'What to do after reading this digest'}
          </h2>
          <p className="text-sm md:text-base leading-relaxed text-muted-foreground font-ui mb-5 max-w-3xl">
            {language === 'zh'
              ? '如果这期里有一条值得继续写，就先回到 X 发观点，再把高信号主题扩成一篇更耐存档的长文。'
              : 'If one item deserves a deeper take, push the short opinion to X first, then expand the strongest thread into a more durable long-form post.'}
          </p>
          <GrowthActions language={language} context={`digest_${post.slug}_footer`} />
        </section>
      </div>
    </div>
  );
}
