/**
 * TopNav — Top navigation bar (static version)
 * - Left: mascot avatar + site name
 * - Center: nav links (Home / Blog / Tech)
 * - Right: language toggle + pull-cord theme toggle
 */
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { trackGrowthEvent } from '../lib/analytics';
import { siteConfig } from '../lib/siteConfig';

const MASCOT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp';

interface TopNavProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export default function TopNav({ currentPath, navigate }: TopNavProps) {
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [cordSwing, setCordSwing] = useState(false);
  const followLabel = language === 'zh' ? '在 X 上关注' : 'Follow on X';

  const navItems = [
    { path: '/', label: language === 'zh' ? '首页' : 'Home' },
    { path: '/blog', label: language === 'zh' ? '博客' : 'Blog' },
    { path: '/tech', label: language === 'zh' ? 'AI 日报' : 'AI Briefing' },
  ];

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
  const isActive = (path: string) => {
    const full = BASE + path;
    if (path === '/') return currentPath === full || currentPath === BASE || currentPath === BASE + '/';
    return currentPath.startsWith(full);
  };

  const handleCordPull = () => {
    if (cordSwing) return;
    setCordSwing(true);
    toggleTheme();
    setTimeout(() => setCordSwing(false), 600);
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

        {/* Left: mascot + site name */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 flex-shrink-0 group"
          style={{ background: 'none', border: 'none', padding: 0 }}
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden ring-1 ring-border group-hover:ring-foreground/30 transition-all duration-150 bg-card">
            <img src={MASCOT_URL} alt="Thomas mascot" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-semibold text-foreground font-display tracking-tight hidden sm:block">
            Thomas
          </span>
        </button>

        {/* Center: nav links */}
        <nav className="flex items-center gap-0.5">
          {navItems.map(({ path, label }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-ui transition-all duration-150
                ${isActive(path)
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }
              `}
              style={{ background: isActive(path) ? 'var(--foreground)' : undefined, border: 'none' }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Right: language + pull-cord theme toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={siteConfig.xProfileUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackGrowthEvent('follow_on_x_click', { context: 'top_nav' })}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground text-background text-xs font-ui font-medium hover:opacity-90 transition-opacity"
            style={{ background: 'var(--foreground)', color: 'var(--background)', textDecoration: 'none' }}
          >
            <span>{followLabel}</span>
            <span aria-hidden="true">↗</span>
          </a>

          {/* Language toggle */}
          <button
            onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
            className="px-2.5 py-1 rounded-md text-xs font-medium font-mono text-muted-foreground hover:text-foreground border border-border hover:border-foreground/30 bg-transparent hover:bg-accent transition-all duration-150"
            title="Switch language"
          >
            {language === 'zh' ? 'EN' : '中文'}
          </button>

          {/* Pull-cord theme toggle */}
          <button
            onClick={handleCordPull}
            className="relative flex items-center justify-center w-8 h-14 -my-2 group"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
            style={{ background: 'none', border: 'none' }}
          >
            <div
              className="absolute top-0 left-1/2 flex flex-col items-center transition-transform duration-500 origin-top"
              style={{
                transform: `translateX(-50%) rotate(${cordSwing ? '20deg' : '0deg'})`,
                transformOrigin: '50% 0%',
                transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
              }}
            >
              {/* Cord line */}
              <div className="w-px h-5 border-l border-dashed border-muted-foreground/50 group-hover:border-muted-foreground transition-colors" />
              {/* Pull bulb */}
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110
                ${theme === 'dark'
                  ? 'bg-amber-400/90 text-amber-900 shadow-[0_0_8px_2px_rgba(251,191,36,0.3)]'
                  : 'bg-slate-700 text-slate-100 shadow-sm'
                }
              `}>
                {theme === 'dark' ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="5"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
                    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                    <line x1="2" y1="12" x2="5" y2="12"/>
                    <line x1="19" y1="12" x2="22" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
                    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
