/**
 * AI Digest Page (static version)
 * Reads from src/data/tech-news.json (auto-updated by automation daily)
 */
import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { TechNewsItem } from '../types';
import techNewsData from '../data/tech-news.json';

const tagColorMap: Record<string, string> = {
  'AI': 'bg-violet-100 text-violet-700',
  'Apple': 'bg-sky-100 text-sky-700',
  'Open Source': 'bg-emerald-100 text-emerald-700',
  'Infrastructure': 'bg-orange-100 text-orange-700',
  'Tools': 'bg-blue-100 text-blue-700',
  'Security': 'bg-red-100 text-red-700',
  'Web': 'bg-cyan-100 text-cyan-700',
  'Mobile': 'bg-pink-100 text-pink-700',
  'Data': 'bg-yellow-100 text-yellow-700',
  'Tech': 'bg-gray-100 text-gray-700',
};

const tagLabelZh: Record<string, string> = {
  'AI': 'AI', 'Apple': 'Apple', 'Open Source': '开源',
  'Infrastructure': '基础设施', 'Tools': '工具', 'Security': '安全',
  'Web': 'Web', 'Mobile': '移动端', 'Data': '数据', 'Tech': '科技',
};

const ITEMS_PER_PAGE = 12;

export default function Tech() {
  const { language } = useLanguage();
  const [activeTag, setActiveTag] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allItems = techNewsData as TechNewsItem[];

  // Collect unique tags
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    allItems.forEach(item => tagSet.add(item.tag));
    return Array.from(tagSet);
  }, [allItems]);

  const allLabel = language === 'zh' ? '全部' : 'All';
  const tagLabels = [allLabel, ...availableTags];

  // Filter by tag
  const filteredItems = useMemo(() => {
    if (!activeTag) return allItems;
    return allItems.filter(item => item.tag === activeTag);
  }, [allItems, activeTag]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const featured = paginatedItems.filter(n => n.featured);
  const rest = paginatedItems.filter(n => !n.featured);

  const handleTagChange = (tag: string) => {
    setActiveTag(tag === allLabel ? '' : tag);
    setCurrentPage(1);
  };

  const getTagLabel = (tag: string) => {
    if (language === 'zh') return tagLabelZh[tag] ?? tag;
    return tag;
  };

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" style={{ color: 'var(--muted-foreground)' }}>
              <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
            </svg>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono">
              {language === 'zh' ? '// AI 情报流' : '// AI DIGEST'}
            </p>
          </div>
          <h1 className="text-3xl font-bold text-foreground font-display mb-1.5">
            {language === 'zh' ? 'AI 情报流' : 'AI Digest'}
          </h1>
          <p className="text-sm text-muted-foreground font-ui">
            {language === 'zh'
              ? `来自优质 AI RSS 源的每日精选 · 共 ${filteredItems.length} 条`
              : `Daily curated highlights from high-signal AI RSS feeds · ${filteredItems.length} items`}
          </p>
        </div>

        {/* Tag filter */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {tagLabels.map((tag) => {
              const isActive = tag === allLabel ? !activeTag : activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => handleTagChange(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium font-ui transition-all duration-150 border ${
                    isActive
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  }`}
                  style={isActive ? { background: 'var(--foreground)', color: 'var(--background)', borderColor: 'var(--foreground)' } : { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                >
                  {tag === allLabel ? tag : getTagLabel(tag)}
                </button>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {allItems.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }}>
                <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
              </svg>
            </div>
            <h2 className="text-base font-semibold text-foreground mb-2 font-display">
              {language === 'zh' ? '暂无内容' : 'No content yet'}
            </h2>
            <p className="text-sm text-muted-foreground font-ui max-w-xs mx-auto">
              {language === 'zh'
                ? 'AI 情报流将由自动任务每天更新'
                : 'The AI digest will be refreshed automatically every day'}
            </p>
          </div>
        ) : (
          <>
            {/* Featured items (2-col) */}
            {featured.length > 0 && (
              <div className="mb-8">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-3">
                  {language === 'zh' ? '// 重点关注' : '// FEATURED'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {featured.map((item) => {
                    const title = language === 'zh' ? item.titleZh : item.titleEn;
                    const summary = language === 'zh' ? item.summaryZh : item.summaryEn;
                    return (
                      <a
                        key={item.id}
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col gap-3 p-4 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-md transition-all duration-150"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                            {getTagLabel(item.tag)}
                          </span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0 mt-0.5" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                        </div>
                        <h2 className="text-sm font-semibold text-foreground leading-snug font-ui line-clamp-2">{title}</h2>
                        <p className="text-xs text-muted-foreground leading-relaxed font-ui line-clamp-3 flex-1">{summary}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono pt-1 border-t border-border">
                          <span className="font-medium">{item.source}</span>
                          <span>·</span>
                          <span>{item.publishedAt}</span>
                          {item.score && item.score > 0 && (
                            <><span>·</span><span>{item.score} pts</span></>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rest of items (list) */}
            {rest.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] font-mono mb-3">
                  {language === 'zh' ? '// 更多动态' : '// MORE UPDATES'}
                </p>
                <div className="space-y-2">
                  {rest.map((item, index) => {
                    const title = language === 'zh' ? item.titleZh : item.titleEn;
                    const summary = language === 'zh' ? item.summaryZh : item.summaryEn;
                    return (
                      <a
                        key={item.id}
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150"
                      >
                        <span className="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }}>
                          {String(index + featured.length + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-1">
                            <h2 className="text-sm font-semibold text-foreground truncate font-ui">{title}</h2>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md font-ui ${tagColorMap[item.tag] ?? 'bg-secondary text-secondary-foreground'}`}>
                                {getTagLabel(item.tag)}
                              </span>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 30%, transparent)' }}>
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                                <polyline points="15 3 21 3 21 9"/>
                                <line x1="10" y1="14" x2="21" y2="3"/>
                              </svg>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground truncate font-ui mb-1.5">{summary}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {item.source} · {item.publishedAt}
                            {item.score && item.score > 0 ? ` · ${item.score} pts` : ''}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-1.5 text-xs rounded-lg font-ui text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-border"
                  style={{ background: 'none', color: 'var(--muted-foreground)' }}
                >
                  ← {language === 'zh' ? '上一页' : 'Prev'}
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium font-mono transition-all duration-150 ${
                        currentPage === page ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      }`}
                      style={currentPage === page ? { background: 'var(--foreground)', color: 'var(--background)' } : { background: 'none', color: 'var(--muted-foreground)', border: 'none' }}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-1.5 text-xs rounded-lg font-ui text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-all border border-transparent hover:border-border"
                  style={{ background: 'none', color: 'var(--muted-foreground)' }}
                >
                  {language === 'zh' ? '下一页' : 'Next'} →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6 mt-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-muted-foreground font-mono text-center">
            © 2026 Thomas · {language === 'zh' ? 'AI 辅助策展，数据来自精选 AI RSS 源' : 'AI-assisted curation from curated AI RSS sources'}
          </p>
        </div>
      </footer>
    </div>
  );
}
