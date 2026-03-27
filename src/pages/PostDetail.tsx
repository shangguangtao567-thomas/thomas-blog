import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import postsData from '../data/posts.json';
import { siteConfig } from '../lib/siteConfig';
import { trackGrowthEvent } from '../lib/analytics';

interface Post {
  slug: string;
  kind?: string;
  titleEn: string;
  excerptEn: string;
  tagEn: string;
  publishedAt: string;
  readTime: number;
  contentEn: string;
  keywords?: string[];
  image?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function titlesOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeTitle(left);
  const normalizedRight = normalizeTitle(right);
  return normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft);
}

function stripRedundantLeadingMarkdownH1(markdown: string, title: string): string {
  const match = markdown.match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match) return markdown;
  if (!titlesOverlap(match[1], title)) return markdown;

  return markdown.replace(/^\s*#\s+.+?\s*(?:\n+|$)/, '');
}

function stripRedundantLeadingHtmlH1(html: string, title: string): string {
  const match = html.match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
  if (!match) return html;
  if (!titlesOverlap(match[1], title)) return html;

  return html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}

function stripDigestSignature(markdown: string): string {
  return markdown.replace(/\n+(?:---\s*\n+)?\*?AI\s+Daily\s*\|[^\n]*\*?\s*$/i, '');
}

export default function PostDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [html, setHtml] = useState('');

  const post = (postsData as Post[]).find((item) => item.slug === slug);
  const isDigest = Boolean(post && (post.kind === 'digest' || post.slug.startsWith('ai-daily-')));
  const isoDate = post ? new Date(post.publishedAt).toISOString() : '';
  const formattedDate = post ? formatDate(post.publishedAt) : '';

  useEffect(() => {
    if (!post) return;

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: post.titleEn,
      description: post.excerptEn,
      url: `https://blog.lincept.com/blog/${post.slug}/`,
      datePublished: isoDate,
      ...(post.image ? { image: post.image } : {}),
      author: {
        '@type': 'Person',
        name: 'Thomas',
        url: 'https://blog.lincept.com/',
        sameAs: ['https://x.com/GuangtaoS29545'],
      },
      publisher: {
        '@type': 'Person',
        name: 'Thomas',
        url: 'https://blog.lincept.com/',
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': `https://blog.lincept.com/blog/${post.slug}/`,
      },
      keywords: (post.keywords || []).join(', '),
      articleSection: isDigest ? 'AI Briefing' : post.tagEn,
      wordCount: post.contentEn ? post.contentEn.split(/\s+/).length : 0,
    };

    const existing = document.getElementById('article-json-ld');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id = 'article-json-ld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    const source = isDigest
      ? stripDigestSignature(stripRedundantLeadingMarkdownH1(post.contentEn || '', post.titleEn))
      : (post.contentEn || '');

    import('marked')
      .then(({ marked }) => {
        const rendered = marked(source);
        if (typeof rendered === 'string') {
          setHtml(isDigest ? stripRedundantLeadingHtmlH1(rendered, post.titleEn) : rendered);
          return;
        }

        rendered.then((value) => setHtml(isDigest ? stripRedundantLeadingHtmlH1(value, post.titleEn) : value));
      })
      .catch(() => {
        setHtml(source.replace(/\n/g, '<br>'));
      });

    return () => {
      script.remove();
    };
  }, [isDigest, isoDate, post]);

  if (!post) {
    return (
      <div className="site-container page-shell">
        <p className="section-label">Not Found</p>
        <p className="section-head__copy">This article does not exist in the current index.</p>
        <a href="/blog" className="button-link--ghost" style={{ marginTop: '1rem' }}>
          Back to writing
        </a>
      </div>
    );
  }

  const backHref = isDigest ? '/briefing' : '/blog';
  const backLabel = isDigest ? 'Back to AI Briefing' : 'Back to writing';
  const shareText = isDigest ? `Share this issue on X` : 'Share on X';
  const heroKicker = isDigest ? 'AI Briefing' : post.tagEn || 'Writing';

  return (
    <div className="site-container detail-shell fade-in">
      <a href={backHref} className="detail-backlink">
        <span aria-hidden="true">&larr;</span>
        <span>{backLabel}</span>
      </a>

      <header className={`detail-hero detail-hero--reading${isDigest ? ' detail-hero--digest' : ''}`}>
        {post.image && (
          <img
            src={post.image}
            alt=""
            className="detail-hero__image"
            loading="eager"
          />
        )}
        <span className="tag-pill">{heroKicker}</span>
        <div className="detail-hero__meta">
          <time dateTime={isoDate}>{formattedDate}</time>
          {post.readTime ? <span>{post.readTime} min read</span> : null}
          {!isDigest && post.kind ? <span>{post.kind}</span> : null}
        </div>
        <h1 className="detail-hero__title detail-hero__title--reading">{post.titleEn}</h1>
        {post.excerptEn ? (
          <div className="tldr-box">
            <span className="tldr-box__label">TL;DR</span>
            <p className="tldr-box__content">{post.excerptEn}</p>
          </div>
        ) : null}
      </header>

      <div className="detail-reading">
        <article className="prose-blog detail-content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div className="detail-reading">
        <div className="article-cta">
          <h3 className="article-cta__title">Enjoyed this? Stay in the loop.</h3>
          <p className="article-cta__copy">Get daily AI briefings and deep dives delivered to your feed.</p>
          <div className="article-cta__actions">
            <a
              href={siteConfig.xProfileUrl}
              target="_blank"
              rel="noreferrer"
              className="button-link"
              onClick={() => trackGrowthEvent('follow_on_x_click', { context: 'article_cta' })}
            >
              Follow on X
            </a>
            <a
              href={`${siteConfig.siteUrl}/feed.xml`}
              target="_blank"
              rel="noreferrer"
              className="button-link--ghost"
              onClick={() => trackGrowthEvent('subscribe_click', { context: 'article_cta', mode: 'rss' })}
            >
              Subscribe via RSS
            </a>
          </div>
        </div>
      </div>

      <div className="detail-footer">
        <a href={backHref} className="button-link--ghost">{backLabel}</a>
        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(post.titleEn)}&url=${encodeURIComponent(`https://blog.lincept.com/blog/${post.slug}`)}&via=GuangtaoS29545`}
          target="_blank"
          rel="noopener noreferrer"
          className="x-cta"
        >
          <span>{shareText}</span>
        </a>
      </div>
    </div>
  );
}
