import postsIndex from '../data/posts-index.json';
import digestsData from '../data/ai-digests.json';

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

interface Digest {
  slug: string;
  titleEn: string;
  date: string;
  path: string;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${mo}/${dy}`;
}

export default function Home() {
  const allPosts = (postsIndex as Post[]).filter(p => !p.slug.startsWith('ai-daily-'));
  const digests = (digestsData as Digest[]).slice(0, 3);

  return (
    <div className="site-container fade-in" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>

      {/* Bio */}
      <section style={{ marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#ffffff', marginBottom: '0.75rem', letterSpacing: '-0.01em' }}>
          Thomas
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#888888', lineHeight: '1.7', maxWidth: '520px', marginBottom: '1.25rem' }}>
          Writing about AI infrastructure, open source tooling, and the mechanics of building in the agent era.
          I track what's actually shipping, not what's being announced.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <a
            href="https://x.com/GuangtaoS29545"
            target="_blank"
            rel="noopener noreferrer"
            className="x-cta"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Follow on X
          </a>
          <a href="/feed.xml" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>RSS ↗</a>
        </div>
      </section>

      {/* Writing */}
      <section style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <p className="section-label">Writing</p>
          <a href="/blog" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>All posts →</a>
        </div>
        <div>
          {allPosts.slice(0, 6).map((post) => (
            <PostItem key={post.slug} post={post} />
          ))}
        </div>
      </section>

      {/* AI Briefing */}
      {digests.length > 0 && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <p className="section-label">AI Briefing</p>
            <a href="/briefing" style={{ fontSize: '0.75rem', color: '#6b6b6b' }}>Archive →</a>
          </div>
          <div>
            {digests.map((digest) => (
              <DigestItem key={digest.slug} digest={digest} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PostItem({ post }: { post: Post }) {
  return (
    <div
      className="post-item"
      onClick={() => { window.location.href = `/blog/${post.slug}`; }}
      role="link"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && (window.location.href = `/blog/${post.slug}`)}
    >
      <span className="post-item-date">{formatDateShort(post.publishedAt)}</span>
      <span className="post-item-title">{post.titleEn}</span>
      {post.tagEn && <span className="post-item-tag">{post.tagEn}</span>}
    </div>
  );
}

function DigestItem({ digest }: { digest: Digest }) {
  return (
    <div
      className="post-item"
      onClick={() => { window.location.href = digest.path || `/briefing/${digest.slug}`; }}
      role="link"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && (window.location.href = digest.path || `/briefing/${digest.slug}`)}
    >
      <span className="post-item-date">{formatDateShort(digest.date)}</span>
      <span className="post-item-title">{digest.titleEn}</span>
      <span className="post-item-tag">digest</span>
    </div>
  );
}