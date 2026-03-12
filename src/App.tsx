import { Route, Switch } from 'wouter';
import Layout from './components/Layout';
import Home from './pages/Home';
import Blog from './pages/Blog';
import PostDetail from './pages/PostDetail';
import Tech from './pages/Tech';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={PostDetail} />
        <Route path="/briefing" component={Tech} />
        <Route path="/tech" component={Tech} />
        <Route>
          <div className="site-container" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
            <p style={{ color: '#6b6b6b', fontSize: '0.875rem' }}>Page not found.</p>
            <a href="/" style={{ fontSize: '0.875rem', color: '#a8a8a8', marginTop: '1rem', display: 'inline-block' }}>← Home</a>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}