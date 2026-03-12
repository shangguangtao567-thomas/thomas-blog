import { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Writing' },
  { href: '/briefing', label: 'AI Briefing' },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #1f1f1f' }}>
        <div className="site-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
          <Link href="/" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ffffff', letterSpacing: '-0.01em' }}>
            Thomas
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {NAV_ITEMS.map(({ href, label }) => {
              const isActive = href === '/' ? location === '/' : location.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontSize: '0.8125rem',
                    color: isActive ? '#ededed' : '#6b6b6b',
                    transition: 'color 0.15s',
                  }}
                >
                  {label}
                </Link>
              );
            })}
            <a
              href="https://x.com/GuangtaoS29545"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.75rem',
                color: '#6b6b6b',
                border: '1px solid #1f1f1f',
                padding: '0.25rem 0.625rem',
                borderRadius: '4px',
                transition: 'border-color 0.15s, color 0.15s',
              }}
            >
              @GuangtaoS29545 ↗
            </a>
          </nav>
        </div>
      </header>

      <main>
        {children}
      </main>

      <footer style={{ borderTop: '1px solid #1f1f1f', marginTop: '5rem' }}>
        <div className="site-container" style={{ padding: '2rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>
            © {new Date().getFullYear()} Thomas · blog.lincept.com
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="/feed.xml" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>RSS</a>
            <a href="https://x.com/GuangtaoS29545" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>X</a>
            <a href="https://github.com/shangguangtao567-thomas" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
