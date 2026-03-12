import { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { AiDigestIndexItem, Post, TopicIndexItem, XDraftPack } from '../types';
import postsIndex from '../data/posts-index.json';
import digestsData from '../data/ai-digests.json';
import topicsData from '../data/topics.json';
import xDraftsData from '../data/x-drafts.json';
import GrowthActions from '../components/GrowthActions';
import { siteConfig } from '../lib/siteConfig';

const MASCOT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp';

interface HomeProps {
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

export default function Home({ navigate }: HomeProps) {
  const { language } = useLanguage();
  const allPosts = postsIndex as Post[];
  const digests = digestsData as AiDigestIndexItem[];
  const topics = topicsData as TopicIndexItem[];
  const xDrafts = xDraftsData as XDraftPack[];

  const latestDigest = digests[0];
  const latestDraft = xDrafts[0];
  const evergreenPosts = useMemo(
    () => allPosts.filter(post => !post.slug.startsWith('ai-daily-')).slice(0, 4),
    [allPosts]
  );
  const evergreenCount = useMemo(
    () => allPosts.filter(post => !post.slug.startsWith('ai-daily-')).length,
    [allPosts]
  );
  const archiveDigests = digests.slice(1, 4);
  const homepageTopics = useMemo(() => {
    const preferred = siteConfig.primaryTopics
      .map(label => topics.find(topic => topic.labelEn.toLowerCase() === label.toLowerCase() || topic.labelZh === label))
      .filter(Boolean) as TopicIndexItem[];
    const used = new Set(preferred.map(item => item.slug));
    const fallback = topics.filter(item => !used.has(item.slug)).slice(0, Math.max(0, 4 - preferred.length));
    return [...preferred, ...fallback].slice(0, 4);
  }, [topics]);

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-6xl mx-auto space-y-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.95fr]">
          <div className="rounded-[32px] border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-border bg-card">
                  <img src={MASCOT_URL} alt="Thomas mascot" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background" />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em] font-mono mb-2">
                  {language === 'zh' ? '// DAILY CONTENT SYSTEM' : '// DAILY CONTENT SYSTEM'}
                </p>
                <h1 className="text-3xl md:text-4xl font-display text-foreground leading-tight mb-3">
                  {language === 'zh'
                    ? '每天一份 AI 日报，外加一份可以直接发去 X 的观点草稿。'
                    : 'One daily AI briefing, plus one X-ready opinion draft every day.'}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground font-ui leading-relaxed max-w-2xl">
                  {language === 'zh'
                    ? '这里不是泛科技展示页，而是一个围绕 X 增长搭出来的内容承接站。主页负责把今日 digest、今日观点和可继续深挖的专题摆清楚。'
                    : 'This is not a generic tech showcase. It is a content landing site built around X growth, with today’s digest, today’s viewpoint, and durable topic archives surfaced up front.'}
                </p>
              </div>
            </div>

            <GrowthActions language={language} context="home_hero" />

            <div className="grid grid-cols-3 gap-3 mt-6">
                {[
                { value: String(digests.length), label: language === 'zh' ? '期日报' : 'Digest issues' },
                { value: String(evergreenCount), label: language === 'zh' ? '篇长文入口' : 'Evergreen posts' },
                { value: String(topics.length), label: language === 'zh' ? '个专题' : 'Topics' },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-border bg-background/70 p-3 text-center">
                  <p className="text-lg font-bold text-foreground font-mono">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground font-ui mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-border bg-card p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] font-mono mb-2">
                  {language === 'zh' ? '// TODAY\'S DIGEST' : '// TODAY\'S DIGEST'}
                </p>
                <h2 className="text-2xl font-display text-foreground">
                  {language === 'zh' ? '先读今天的站内 briefing' : 'Start with today’s local briefing'}
                </h2>
              </div>
              <button
                onClick={() => navigate('/tech')}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors font-ui"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {language === 'zh' ? '全部日报' : 'All digests'}
              </button>
            </div>

            {latestDigest ? (
              <button
                onClick={() => navigate(latestDigest.path)}
                className="w-full text-left rounded-[24px] border border-border bg-background/70 p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <p className="text-[11px] font-mono text-muted-foreground mb-2">{latestDigest.date}</p>
                <h3 className="text-2xl font-display text-foreground leading-tight mb-3">
                  {language === 'zh' ? latestDigest.titleZh : latestDigest.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground font-ui leading-relaxed mb-4">
                  {language === 'zh'
                    ? (latestDigest.issueSummaryZh || latestDigest.excerptZh)
                    : (latestDigest.issueSummaryEn || latestDigest.excerptEn)}
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-ui text-muted-foreground mb-4">
                  <span className="px-3 py-1.5 rounded-full border border-border bg-card">
                    {language === 'zh' ? `${latestDigest.itemCount} 条重点更新` : `${latestDigest.itemCount} highlighted items`}
                  </span>
                  {latestDigest.bodyCoverage && (
                    <span className="px-3 py-1.5 rounded-full border border-border bg-card">
                      {language === 'zh'
                        ? `正文覆盖 ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}`
                        : `Full-body coverage ${latestDigest.bodyCoverage.succeeded}/${latestDigest.bodyCoverage.targeted || latestDigest.itemCount}`}
                    </span>
                  )}
                </div>
                <p className="text-xs font-ui text-foreground">→ {language === 'zh' ? '阅读完整日报' : 'Read full digest'}</p>
              </button>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border p-5 text-sm text-muted-foreground font-ui">
                {language === 'zh' ? '今天的 digest 还没生成。' : 'Today’s digest has not been generated yet.'}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[32px] border border-border bg-card p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] font-mono mb-2">
                  {language === 'zh' ? '// TODAY\'S VIEW' : '// TODAY\'S VIEW'}
                </p>
                <h2 className="text-2xl font-display text-foreground">
                  {language === 'zh' ? '先审中文，再发 X' : 'Review in Chinese before posting to X'}
                </h2>
              </div>
              {latestDraft?.digestPath && (
                <button
                  onClick={() => navigate(latestDraft.digestPath)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors font-ui"
                  style={{ background: 'none', border: 'none', padding: 0 }}
                >
                  {language === 'zh' ? '看证据链' : 'See evidence'}
                </button>
              )}
            </div>

            {latestDraft ? (
              <div className="space-y-4">
                <div className="rounded-[24px] border border-border bg-background/70 p-5">
                  <p className="text-[11px] font-mono text-muted-foreground mb-3">{latestDraft.date}</p>
                  <p className="text-lg font-display text-foreground leading-relaxed mb-4">
                    {language === 'zh' ? latestDraft.angleZh : latestDraft.angleEn}
                  </p>
                  <div className="space-y-2">
                    {(language === 'zh' ? latestDraft.hooksZh : latestDraft.hooksEn).slice(0, 3).map((hook, index) => (
                      <div key={hook} className="flex gap-3 text-sm font-ui text-muted-foreground">
                        <span className="text-[11px] font-mono text-foreground/70 pt-0.5">{String(index + 1).padStart(2, '0')}</span>
                        <span>{hook}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-background/70 p-5">
                  <p className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground mb-2">
                    {language === 'zh' ? '短帖版本' : 'Short-post version'}
                  </p>
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-foreground font-ui">{language === 'zh' ? latestDraft.shortPostZh : latestDraft.shortPostEn}</pre>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border p-5 text-sm text-muted-foreground font-ui">
                {language === 'zh' ? '今天的 X 草稿包还没生成。' : 'Today’s X draft pack has not been generated yet.'}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-border bg-card p-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] font-mono mb-2">
                {language === 'zh' ? '// EVERGREEN POSTS' : '// EVERGREEN POSTS'}
              </p>
              <h2 className="text-2xl font-display text-foreground mb-4">
                {language === 'zh' ? '站内长文入口' : 'Evergreen reading'}
              </h2>

              <div className="space-y-3">
                {evergreenPosts.map(post => (
                  <button
                    key={post.slug}
                    onClick={() => navigate(`/blog/${post.slug}`)}
                    className="w-full text-left rounded-2xl border border-border bg-background/70 p-4 hover:border-foreground/20 hover:shadow-sm transition-all"
                  >
                    <p className="text-[11px] font-mono text-muted-foreground mb-2">{formatDate(post.publishedAt, language)}</p>
                    <p className="text-base font-display text-foreground leading-snug mb-2">
                      {language === 'zh' ? post.titleZh : post.titleEn}
                    </p>
                    <p className="text-sm text-muted-foreground font-ui leading-relaxed">
                      {language === 'zh' ? post.excerptZh : post.excerptEn}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-border bg-card p-6">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] font-mono mb-2">
                {language === 'zh' ? '// TOPIC ARCHIVES' : '// TOPIC ARCHIVES'}
              </p>
              <h2 className="text-2xl font-display text-foreground mb-4">
                {language === 'zh' ? '按主题继续往下读' : 'Continue by topic'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {homepageTopics.map(topic => (
                  <button
                    key={topic.slug}
                    onClick={() => navigate(`/topic/${topic.slug}`)}
                    className="px-3 py-2 rounded-full border border-border text-sm font-ui text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                    style={{ background: 'none' }}
                  >
                    {(language === 'zh' ? topic.labelZh : topic.labelEn)} · {topic.count}
                  </button>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="rounded-[32px] border border-border bg-card p-6 md:p-8">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.16em] font-mono mb-2">
                {language === 'zh' ? '// DIGEST ARCHIVE' : '// DIGEST ARCHIVE'}
              </p>
              <h2 className="text-2xl font-display text-foreground">
                {language === 'zh' ? '往期日报入口' : 'Past digest issues'}
              </h2>
            </div>
            <button
              onClick={() => navigate('/tech')}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-ui"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {language === 'zh' ? '进入日报中心' : 'Open digest hub'}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {archiveDigests.map(digest => (
              <button
                key={digest.slug}
                onClick={() => navigate(digest.path)}
                className="text-left rounded-[24px] border border-border bg-background/70 p-5 hover:border-foreground/20 hover:shadow-sm transition-all"
              >
                <p className="text-[11px] font-mono text-muted-foreground mb-2">{digest.date}</p>
                <h3 className="text-lg font-display text-foreground mb-2 leading-snug">
                  {language === 'zh' ? digest.titleZh : digest.titleEn}
                </h3>
                <p className="text-sm text-muted-foreground font-ui leading-relaxed">
                  {language === 'zh' ? digest.excerptZh : digest.excerptEn}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
