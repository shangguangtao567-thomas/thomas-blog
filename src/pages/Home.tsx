import postsIndex from '../data/posts-index.json';
import digestsData from '../data/ai-digests.json';
import { siteConfig } from '../lib/siteConfig';

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

interface DigestTheme {
  themeEn?: string;
  count?: number;
}

interface Digest {
  slug: string;
  titleEn: string;
  date: string;
  path?: string;
  excerptEn?: string;
  itemCount?: number;
  themes?: DigestTheme[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/[#>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Home() {
  const posts = (postsIndex as Post[]).filter((post) => !post.slug.startsWith('ai-daily-'));
  const digests = digestsData as Digest[];

  const featuredPost = posts[0];
  const morePosts = posts.slice(1, 7);
  const latestDigests = digests.slice(0, 3);

  return (
    <div className="site-container-wide page-shell page-shell--home fade-in">
      {/* ── Hero: featured article as the centerpiece ── */}
      <section className="hero-editorial slide-up">
        <div className="hero-editorial__intro">
          <p className="eyebrow">Latest</p>
          <h1 className="hero-editorial__headline">
            <a href={`/blog/${featuredPost?.slug}`}>
              {featuredPost?.titleEn}
            </a>
          </h1>
          <p className="hero-editorial__excerpt">{featuredPost?.excerptEn}</p>
          <div className="hero-editorial__meta">
            <time>{featuredPost ? formatDate(featuredPost.publishedAt) : ''}</time>
            <span>{featuredPost?.readTime} min read</span>
            {featuredPost?.tagEn && <span className="tag-pill">{featuredPost.tagEn}</span>}
          </div>
          <a href={`/blog/${featuredPost?.slug}`} className="button-link" style={{ marginTop: '1.5rem' }}>
            Read article →
          </a>
        </div>
        {featuredPost?.image && (
          <a href={`/blog/${featuredPost.slug}`} className="hero-editorial__image-wrap">
            <img src={featuredPost.image} alt="" className="hero-editorial__image" loading="eager" />
          </a>
        )}
      </section>

      {/* ── More Writing ── */}
      <section className="home-section slide-up slide-up-delay-1">
        <div className="section-head">
          <div>
            <p className="section-label">Writing</p>
            <h2 className="section-head__title">More essays & guides</h2>
          </div>
          <a href="/blog" className="section-head__link">All writing →</a>
        </div>

        <div className="post-grid">
          {morePosts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="post-card">
              {post.image && (
                <div className="post-card__img-wrap">
                  <img src={post.image} alt="" className="post-card__img" loading="lazy" />
                </div>
              )}
              <div className="post-card__body">
                <div className="post-card__meta">
                  <time>{formatDate(post.publishedAt)}</time>
                  <span>{post.readTime} min</span>
                  {post.tagEn && <span className="tag-pill">{post.tagEn}</span>}
                </div>
                <h3 className="post-card__title">{post.titleEn}</h3>
                <p className="post-card__excerpt">{post.excerptEn}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── AI Briefing ── */}
      <section className="home-section slide-up slide-up-delay-2">
        <div className="section-head">
          <div>
            <p className="section-label">AI Briefing</p>
            <h2 className="section-head__title">Daily intelligence</h2>
          </div>
          <a href="/briefing" className="section-head__link">Full archive →</a>
        </div>

        <div className="briefing-grid">
          {latestDigests.map((digest) => (
            <a key={digest.slug} href={digest.path || `/blog/${digest.slug}`} className="briefing-card">
              <div className="briefing-card__meta">
                <span>{formatDate(digest.date)}</span>
                {digest.itemCount ? <span>{digest.itemCount} items</span> : null}
              </div>
              <h3 className="briefing-card__title">{digest.titleEn}</h3>
              {digest.excerptEn ? <p className="briefing-card__excerpt">{stripMarkdown(digest.excerptEn)}</p> : null}
              <div className="briefing-card__themes">
                {(digest.themes || []).slice(0, 3).map((theme) => (
                  <span key={theme.themeEn} className="briefing-chip">
                    {theme.themeEn}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
