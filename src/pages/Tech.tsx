import digestsData from '../data/ai-digests.json';

interface Digest {
  slug: string;
  titleEn: string;
  date: string;
  path: string;
  excerptEn?: string;
  itemCount?: number;
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

export default function Tech() {
  const digests = digestsData as Digest[];

  return (
    <div className="site-container fade-in" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'var(--fg)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
          AI Briefing
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--fg-subtle)' }}>
          Daily digests on AI infrastructure, open source models, and developer tooling.
        </p>
      </div>

      <div>
        {digests.map((digest) => (
          <div
            key={digest.slug}
            className="post-item"
            onClick={() => { window.location.href = digest.path || `/briefing/${digest.slug}`; }}
            role="link"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && (window.location.href = digest.path || `/briefing/${digest.slug}`)}
          >
            <span className="post-item-date">{formatDateShort(digest.date)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="post-item-title">{digest.titleEn}</div>
              {digest.excerptEn && (
                <div style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {digest.excerptEn}
                </div>
              )}
            </div>
            {digest.itemCount && (
              <span className="post-item-tag">{digest.itemCount} items</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}