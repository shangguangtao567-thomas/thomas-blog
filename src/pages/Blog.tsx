import postsIndex from '../data/posts-index.json';

interface Post {
  slug: string;
  titleEn: string;
  excerptEn: string;
  tag: string;
  tagEn: string;
  publishedAt: string;
  readTime: number;
  kind?: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${mo}/${dy}`;
}

export default function Blog() {
  const posts = (postsIndex as Post[]).filter(p => !p.slug.startsWith('ai-daily-'));

  return (
    <div className="site-container fade-in" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
          Writing
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b6b6b' }}>
          {posts.length} posts on AI, open source, and building in the agent era.
        </p>
      </div>

      <div>
        {posts.map((post) => (
          <article
            key={post.slug}
            className="post-item"
            onClick={() => { window.location.href = `/blog/${post.slug}`; }}
            role="link"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && (window.location.href = `/blog/${post.slug}`)}
          >
            <span className="post-item-date">{formatDateShort(post.publishedAt)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="post-item-title">{post.titleEn}</div>
              {post.excerptEn && (
                <div style={{ fontSize: '0.8rem', color: '#6b6b6b', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {post.excerptEn}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              {post.tagEn && <span className="post-item-tag">{post.tagEn}</span>}
              {post.readTime && <span style={{ fontSize: '0.65rem', color: '#6b6b6b', fontFamily: 'JetBrains Mono, monospace' }}>{post.readTime}m</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}