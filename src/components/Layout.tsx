import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { ThemeProvider } from '../contexts/ThemeContext';
import { siteConfig } from '../lib/siteConfig';
import TopNav from './TopNav';

function InnerLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();

  return (
    <div className="site-shell bg-background text-foreground">
      <div className="ambient-bg" aria-hidden="true" />
      <TopNav currentPath={location} navigate={navigate} />

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer__panel">
          <div>
            <p className="site-footer__title">Thomas</p>
            <p className="site-footer__copy">AI infrastructure, open source tooling, and agent-era engineering.</p>
          </div>

          <div className="site-footer__meta">
            <div className="site-footer__links">
              <a href="/feed.xml">RSS</a>
              <a href={siteConfig.xProfileUrl} target="_blank" rel="noopener noreferrer">X</a>
              <a href="https://github.com/shangguangtao567-thomas" target="_blank" rel="noopener noreferrer">GitHub</a>
            </div>
            <span>&copy; {new Date().getFullYear()} Thomas &middot; blog.lincept.com</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <InnerLayout>{children}</InnerLayout>
    </ThemeProvider>
  );
}
