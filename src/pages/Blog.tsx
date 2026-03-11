/**
 * Blog Page — Article Archive (static version)
 * Reads from src/data/posts-index.json, client-side search + filter
 */
import { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Post } from '../types';
import postsIndex from '../data/posts-index.json';

const POSTS_PER_PAGE = 10;

interface BlogProps {
  navigate: (path: string) => void;
}

export default function Blog({ navigate }: BlogProps) {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const allPosts = (postsIndex as Post[]).filter(post => !post.slug.startsWith('ai-daily-'));

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allPosts.forEach(p => tagSet.add(language === 'zh' ? p.tag : p.tagEn));
    return Array.from(tagSet);
  }, [allPosts, language]);

  const allLabel = language === 'zh' ? '全部' : 'All';
  const tags = [allLabel, ...allTags];

  const filteredPosts = useMemo(() => {
    return allPosts.filter(post => {
      const title = language === 'zh' ? post.titleZh : post.titleEn;
      const excerpt = language === 'zh' ? post.excerptZh : post.excerptEn;
      const tag = language === 'zh' ? post.tag : post.tagEn;

      const matchesSearch = !searchQuery ||
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        excerpt.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTag = !activeTag || tag === activeTag;

      return matchesSearch && matchesTag;
    });
  }, [allPosts, language, searchQuery, activeTag]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const handleTagChange = (tag: string) => {
    setActiveTag(tag === allLabel ? '' : tag);
    setCurrentPage(1);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen">
      <div className="px-6 md:px-8 py-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground font-display mb-1.5">
            {language === 'zh' ? '博客' : 'Blog'}
          </h1>
          <p className="text-sm text-muted-foreground font-ui">
            {language === 'zh'
              ? `共 ${filteredPosts.length} 篇文章，关于 AI、开源工具和技术趋势`
              : `${filteredPosts.length} posts about AI, open source tools, and tech trends`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" style={{ color: 'var(--muted-foreground)' }}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="search"
              placeholder={language === 'zh' ? '搜索文章...' : 'Search posts...'}
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 transition-all duration-200 font-ui"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            />
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            {tags.map((tag) => {
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
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {paginatedPosts.length > 0 ? (
          <div className="space-y-2">
            {paginatedPosts.map((post, index) => {
              const title = language === 'zh' ? post.titleZh : post.titleEn;
              const excerpt = language === 'zh' ? post.excerptZh : post.excerptEn;
              const tag = language === 'zh' ? post.tag : post.tagEn;
              const date = post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })
                : '';

              return (
                <button
                  key={post.slug}
                  onClick={() => navigate(`/blog/${post.slug}`)}
                  className="group flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-foreground/20 hover:shadow-sm transition-all duration-150 w-full text-left"
                  style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
                >
                  <span className="text-[11px] font-mono pt-0.5 w-6 flex-shrink-0 text-right" style={{ color: 'color-mix(in oklch, var(--muted-foreground) 40%, transparent)' }}>
                    {String((currentPage - 1) * POSTS_PER_PAGE + index + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <h2 className="text-sm font-semibold text-foreground truncate font-ui">{title}</h2>
                      {tag && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md font-ui bg-secondary text-secondary-foreground flex-shrink-0" style={{ background: 'var(--secondary)', color: 'var(--secondary-foreground)' }}>
                          {tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate font-ui mb-2">{excerpt}</p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                      <span>{date}</span>
                      {post.readTime && (
                        <span className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          {post.readTime}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground font-ui">
            <p className="text-3xl mb-3 font-mono">404</p>
            <p className="text-sm">{language === 'zh' ? '暂无相关文章' : 'No posts found'}</p>
          </div>
        )}

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
      </div>

      <footer className="border-t border-border py-6 px-6 mt-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-muted-foreground font-mono text-center">
            © 2026 Thomas · {language === 'zh' ? '版权所有' : 'All rights reserved'}
          </p>
        </div>
      </footer>
    </div>
  );
}
