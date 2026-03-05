import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Blog from './pages/Blog';
import PostDetail from './pages/PostDetail';
import Tech from './pages/Tech';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';

// The base path set in vite.config.ts (e.g. '/thomas-blog/')
// Strip it from the pathname before routing so routes work the same locally and on GitHub Pages
const BASE = import.meta.env.BASE_URL.replace(/\/$/, ''); // e.g. '/thomas-blog' or ''

function stripBase(path: string): string {
  if (BASE && path.startsWith(BASE)) {
    return path.slice(BASE.length) || '/';
  }
  return path || '/';
}

function parseRoute(rawPath: string): { page: string; slug?: string } {
  const path = stripBase(rawPath);
  if (path === '/' || path === '') return { page: 'home' };
  if (path === '/blog') return { page: 'blog' };
  if (path === '/tech') return { page: 'tech' };
  const blogMatch = path.match(/^\/blog\/(.+)$/);
  if (blogMatch) return { page: 'post', slug: blogMatch[1] };
  return { page: '404' };
}

function AppInner() {
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate with base prefix applied
  const navigate = (path: string) => {
    const fullPath = BASE + path;
    window.history.pushState({}, '', fullPath);
    setCurrentPath(fullPath);
    window.scrollTo(0, 0);
  };

  const route = parseRoute(currentPath);

  const renderPage = () => {
    switch (route.page) {
      case 'home':
        return <Home navigate={navigate} />;
      case 'blog':
        return <Blog navigate={navigate} />;
      case 'tech':
        return <Tech />;
      case 'post':
        return <PostDetail slug={route.slug!} navigate={navigate} />;
      default:
        return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-mono font-bold text-muted-foreground mb-4">404</p>
              <button
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground hover:text-foreground font-ui underline underline-offset-4"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                Go home
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout currentPath={currentPath} navigate={navigate}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}
