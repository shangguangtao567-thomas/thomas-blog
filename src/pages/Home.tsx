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

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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

  const heroPost = posts[0];
  const featuredPosts = posts.slice(1, 4);
  const latestDigests = digests.slice(0, 3);

  return (
    <div className="site-container-wide page-shell page-shell--home fade-in">
      <section className="home-hero">
        <div className="hero-panel slide-up">
          <p className="eyebrow">Thomas</p>
          <h1 className="hero-panel__title">
            <span className="text-gradient">AI, open source,</span> and agent-era engineering.
          </h1>
          <p className="hero-panel__copy">
            Deep dives, daily briefings, and honest analysis on what is actually shipping in AI — not what is being announced.
          </p>

          <div className="hero-panel__actions">
            <a href="/blog" className="button-link">Read the Writing</a>
            <a href="/briefing" className="button-link--ghost">AI Briefing</a>
            <a href={siteConfig.xProfileUrl} target="_blank" rel="noreferrer" className="x-cta">Follow on X</a>
          </div>
        </div>

        {heroPost && (
          <a href={`/blog/${heroPost.slug}`} className="feature-card feature-card--hero slide-up slide-up-delay-1">
            {heroPost.image && (
              <img
                src={heroPost.image}
                alt=""
                className="feature-card__image"
                loading="lazy"
              />
            )}
            <div>
              <p className="section-label">Latest</p>
              <div className="feature-card__meta">
                <span>{formatDate(heroPost.publishedAt)}</span>
                <span>{heroPost.readTime} min read</span>
                {heroPost.tagEn ? <span className="tag-pill">{heroPost.tagEn}</span> : null}
              </div>
              <h2 className="feature-card__title">{heroPost.titleEn}</h2>
              <p className="feature-card__excerpt">{heroPost.excerptEn}</p>
            </div>

            <div className="feature-card__footer">
              <span className="button-link--ghost">Read article →</span>
            </div>
          </a>
        )}
      </section>

      <section className="home-section slide-up slide-up-delay-2">
        <div className="section-head">
          <div>
            <p className="section-label">Writing</p>
            <h2 className="section-head__title">Latest essays & guides</h2>
            <p className="section-head__copy">{posts.length} deep dives on AI infrastructure, tools, and systems thinking.</p>
          </div>
          <a href="/blog" className="section-head__link">All writing →</a>
        </div>

        <div className="story-grid">
          {featuredPosts.map((post) => (
            <a key={post.slug} href={`/blog/${post.slug}`} className="story-card">
              {post.image && (
                <img
                  src={post.image}
                  alt=""
                  className="story-card__image"
                  loading="lazy"
                />
              )}
              <div className="story-row__meta">
                <span>{formatShortDate(post.publishedAt)}</span>
                {post.tagEn ? <span className="tag-pill">{post.tagEn}</span> : null}
              </div>
              <h3 className="story-card__title">{post.titleEn}</h3>
              <p className="story-card__excerpt">{post.excerptEn}</p>
              <div className="story-card__footer">
                <span className="meta-kicker">{post.readTime} min read</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="home-section slide-up slide-up-delay-3">
        <div className="section-head">
          <div>
            <p className="section-label">AI Briefing</p>
            <h2 className="section-head__title">Daily intelligence</h2>
            <p className="section-head__copy">Curated AI news, grouped by theme and signal. {digests.length} issues and counting.</p>
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
