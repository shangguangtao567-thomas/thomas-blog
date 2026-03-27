import postsIndex from '../data/posts-index.json';

interface Post {
  slug: string;
  titleEn: string;
  excerptEn: string;
  tagEn: string;
  publishedAt: string;
  readTime: number;
  kind?: string;
  image?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function hasDistinctTag(post: Post): boolean {
  if (!post.tagEn) return false;
  return String(post.kind || '').toLowerCase() !== post.tagEn.toLowerCase();
}

export default function Blog() {
  const posts = (postsIndex as Post[]).filter((post) => !post.slug.startsWith('ai-daily-'));
  const leadPost = posts[0];
  const restPosts = posts.slice(1);

  return (
    <div className="site-container-wide page-shell fade-in">
      <section className="home-section">
        <div className="section-head">
          <div>
            <p className="section-label">Writing</p>
            <h1 className="section-head__title">Latest articles</h1>
            <p className="section-head__copy">{posts.length} essays, reviews, and explainers.</p>
          </div>
        </div>

        {leadPost && (
          <a href={`/blog/${leadPost.slug}`} className="feature-card feature-card--lead">
            {leadPost.image && (
              <img
                src={leadPost.image}
                alt=""
                className="feature-card__image"
                loading="lazy"
              />
            )}
            <div>
              <p className="section-label">Latest</p>
              <div className="feature-card__meta">
                <span>{formatDate(leadPost.publishedAt)}</span>
                <span>{leadPost.readTime} min read</span>
                {leadPost.tagEn ? <span className="tag-pill">{leadPost.tagEn}</span> : null}
              </div>
              <h2 className="feature-card__title">{leadPost.titleEn}</h2>
              <p className="feature-card__excerpt">{leadPost.excerptEn}</p>
            </div>
            <div className="feature-card__footer">
              <span className="button-link--ghost">Read lead story →</span>
            </div>
          </a>
        )}
      </section>

      <section className="home-section">
        <div className="story-list">
          {restPosts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="story-row">
              <div className="story-row__date">{formatShortDate(post.publishedAt)}</div>
              <div className="story-row__body">
                <div className="story-row__meta">
                  {post.kind ? <span className="meta-kicker">{post.kind}</span> : null}
                  {hasDistinctTag(post) ? <span className="tag-pill">{post.tagEn}</span> : null}
                </div>
                <h2 className="story-row__title">{post.titleEn}</h2>
                <p className="story-row__excerpt">{post.excerptEn}</p>
              </div>
              <div className="story-row__suffix">
                <span className="meta-kicker">{post.readTime} min</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
