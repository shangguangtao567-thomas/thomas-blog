import { MouseEvent, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { trackGrowthEvent } from '../lib/analytics';
import { siteConfig } from '../lib/siteConfig';

const MASCOT_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663381834685/XCS6Hwos8gWNHteCJu7gAk/avatar-mascot-dark-3pskxT3vg4vKNUuH8m9JKo.webp';

interface TopNavProps {
  currentPath: string;
  navigate: (path: string) => void;
}

interface NavItem {
  path: string;
  label: string;
  matchPaths?: string[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Home' },
  { path: '/blog', label: 'Writing' },
  { path: '/briefing', label: 'AI Briefing', matchPaths: ['/briefing', '/tech'] },
];

function shouldHandleInternally(event: MouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

export default function TopNav({ currentPath, navigate }: TopNavProps) {
  const { theme, toggleTheme } = useTheme();
  const [cordSwing, setCordSwing] = useState(false);

  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = currentPath || '/';

  const isActive = ({ path, matchPaths }: NavItem) => {
    const candidates = matchPaths?.length ? matchPaths : [path];

    return candidates.some((candidate) => {
      const full = `${base}${candidate}`;
      if (candidate === '/') {
        return normalizedPath === full || normalizedPath === base || normalizedPath === `${base}/` || normalizedPath === '/';
      }

      return normalizedPath === full || normalizedPath.startsWith(`${full}/`) || normalizedPath === candidate || normalizedPath.startsWith(`${candidate}/`);
    });
  };

  const onInternalClick = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!shouldHandleInternally(event)) return;
    event.preventDefault();
    navigate(path);
  };

  const handleCordPull = () => {
    if (cordSwing) return;
    setCordSwing(true);
    toggleTheme();
    window.setTimeout(() => setCordSwing(false), 600);
  };

  return (
    <header className="topnav">
      <div className="topnav__inner">
        <a href="/" className="topnav__brand" onClick={(event) => onInternalClick(event, '/')}>
          <span className="topnav__brand-mark" aria-hidden="true">
            <img src={MASCOT_URL} alt="" />
          </span>
          <span className="topnav__brand-copy">
            <span className="topnav__brand-name">Thomas</span>
          </span>
        </a>

        <nav className="topnav__nav" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(event) => onInternalClick(event, item.path)}
              className={`topnav__link${isActive(item) ? ' is-active' : ''}`}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="topnav__actions">
          <a
            href={siteConfig.xProfileUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackGrowthEvent('follow_on_x_click', { context: 'top_nav' })}
            className="topnav__follow"
          >
            <span>Follow on X</span>
          </a>

          <button
            type="button"
            onClick={handleCordPull}
            className="topnav__theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            <span
              className="topnav__theme-cord"
              style={{
                transform: `translateX(-50%) rotate(${cordSwing ? '22deg' : '0deg'})`,
                transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <span className="topnav__theme-line" aria-hidden="true" />
              <span className={`topnav__theme-pull${theme === 'light' ? ' is-dark' : ''}`}>
                {theme === 'dark' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                    <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
                    <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
