import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { ThemeProvider } from '../contexts/ThemeContext';
import TopNav from './TopNav';

function InnerLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav currentPath={location} navigate={(path) => window.location.href = path} />

      <main>
        {children}
      </main>

      <footer className="border-t border-border mt-20">
        <div className="site-container" style={{ padding: '2rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Thomas · blog.lincept.com
          </span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="/feed.xml" className="text-xs text-muted-foreground hover:text-foreground transition-colors">RSS</a>
            <a href="https://x.com/GuangtaoS29545" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">X</a>
            <a href="https://github.com/shangguangtao567-thomas" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">GitHub</a>
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
