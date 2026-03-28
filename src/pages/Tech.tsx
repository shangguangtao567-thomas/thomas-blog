import digestsData from '../data/ai-digests.json';

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
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

export default function Tech() {
  const digests = digestsData as Digest[];
  const leadDigest = digests[0];
  const gridDigests = digests.slice(1, 4);
  const restDigests = digests.slice(4);

  return (
    <div className="site-container-wide page-shell fade-in">
      <section className="home-section">
        <div className="section-head">
          <div>
            <p className="section-label">AI Briefing</p>
            <h1 className="section-head__title">Daily issues</h1>
            <p className="section-head__copy">{digests.length} briefings grouped by topic and signal.</p>
          </div>
        </div>

        {leadDigest && (
          <a href={leadDigest.path || `/blog/${leadDigest.slug}`} className="feature-card feature-card--lead">
            <p className="section-label">Latest issue</p>
            <div className="briefing-card__meta">
              <span>{formatDate(leadDigest.date)}</span>
              {leadDigest.itemCount ? <span>{leadDigest.itemCount} items</span> : null}
            </div>
            <h2 className="feature-card__title">{leadDigest.titleEn}</h2>
            {leadDigest.excerptEn ? <p className="feature-card__excerpt">{stripMarkdown(leadDigest.excerptEn)}</p> : null}
            <div className="briefing-card__themes">
              {(leadDigest.themes || []).slice(0, 3).map((theme) => (
                <span key={theme.themeEn} className="briefing-chip">
                  {theme.themeEn}
                </span>
              ))}
            </div>
          </a>
        )}
      </section>

      <section className="home-section">
        <div className="briefing-grid">
          {gridDigests.map((digest) => (
            <a key={digest.slug} href={digest.path || `/blog/${digest.slug}`} className="briefing-card">
              <div className="briefing-card__meta">
                <span>{formatDate(digest.date)}</span>
                {digest.itemCount ? <span>{digest.itemCount} items</span> : null}
              </div>
              <h2 className="briefing-card__title">{digest.titleEn}</h2>
              {digest.excerptEn ? <p className="briefing-card__excerpt">{stripMarkdown(digest.excerptEn)}</p> : null}
              <div className="briefing-card__themes">
                {(digest.themes || []).slice(0, 2).map((theme) => (
                  <span key={theme.themeEn} className="briefing-chip">
                    {theme.themeEn}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>

        <div className="story-list" style={{ marginTop: '1rem' }}>
          {restDigests.map((digest) => (
            <a key={digest.slug} href={digest.path || `/blog/${digest.slug}`} className="story-row">
              <div className="story-row__date">{new Date(digest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div className="story-row__body">
                <div className="story-row__meta">
                  <span className="meta-kicker">AI Daily</span>
                  {digest.itemCount ? <span className="tag-pill">{digest.itemCount} items</span> : null}
                </div>
                <h2 className="story-row__title">{digest.titleEn}</h2>
                {digest.excerptEn ? <p className="story-row__excerpt">{stripMarkdown(digest.excerptEn)}</p> : null}
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
