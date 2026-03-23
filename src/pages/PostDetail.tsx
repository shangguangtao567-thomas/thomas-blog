import { useEffect, useState } from 'react';
import { useParams } from 'wouter';
import postsData from '../data/posts.json';

interface Post {
  slug: string;
  titleEn: string;
  excerptEn: string;
  tag: string;
  tagEn: string;
  publishedAt: string;
  readTime: number;
  contentEn: string;
  keywords?: string[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function PostDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [html, setHtml] = useState('');

  const post = (postsData as Post[]).find(p => p.slug === slug);

  const isoDate = post ? new Date(post.publishedAt).toISOString() : '';
  const formattedDate = post ? formatDate(post.publishedAt) : '';

  useEffect(() => {
    if (!post) return;
    // Inject JSON-LD structured data for this article
    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.titleEn,
      "description": post.excerptEn,
      "url": `https://blog.lincept.com/blog/${post.slug}/`,
      "datePublished": isoDate,
      "author": {
        "@type": "Person",
        "name": "Thomas",
        "url": "https://blog.lincept.com/",
        "sameAs": ["https://x.com/GuangtaoS29545"]
      },
      "publisher": {
        "@type": "Person",
        "name": "Thomas",
        "url": "https://blog.lincept.com/"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://blog.lincept.com/blog/${post.slug}/`
      },
      "keywords": (post.keywords || []).join(', '),
      "articleSection": post.tagEn,
      "wordCount": post.contentEn ? post.contentEn.split(/\s+/).length : 0
    };
    const existing = document.getElementById('article-json-ld');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = 'article-json-ld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    // Use marked from CDN or inline rendering
    const content = post.contentEn || '';
    // Simple markdown to html (basic)
    import('marked').then(({ marked }) => {
      const result = marked(content);
      if (typeof result === 'string') {
        setHtml(result);
      } else {
        result.then(setHtml);
      }
    }).catch(() => {
      setHtml(content.replace(/\n/g, '<br>'));
    });
  }, [post, isoDate]);

  if (!post) {
    return (
      <div className="site-container" style={{ paddingTop: '4rem', paddingBottom: '6rem' }}>
        <p style={{ color: 'var(--fg-subtle)', fontSize: '0.875rem' }}>Post not found.</p>
        <a href="/blog" style={{ fontSize: '0.875rem', color: 'var(--link)', marginTop: '1rem', display: 'inline-block' }}>← Back to writing</a>
      </div>
    );
  }

  return (
    <div className="site-container fade-in" style={{ paddingTop: '3rem', paddingBottom: '6rem' }}>
      {/* Back */}
      <a href="/blog" style={{ fontSize: '0.8125rem', color: 'var(--fg-subtle)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '2.5rem', transition: 'color 0.15s' }}>
        ← Writing
      </a>

      {/* Header */}
      <header style={{ marginBottom: '2.5rem' }}>
        {post.tagEn && (
          <span className="tag-pill" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>{post.tagEn}</span>
        )}
        <h1 style={{ fontSize: '1.625rem', fontWeight: '600', color: 'var(--fg)', lineHeight: '1.3', letterSpacing: '-0.025em', marginBottom: '0.75rem', marginTop: '0.5rem' }}>
          {post.titleEn}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <time dateTime={isoDate} style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>{formattedDate}</time>
          {post.readTime && (
            <span style={{ fontSize: '0.8rem', color: 'var(--fg-subtle)' }}>{post.readTime} min read</span>
          )}
        </div>
        {post.excerptEn && (
          <p style={{ fontSize: '0.9375rem', color: 'var(--fg-muted)', lineHeight: '1.65', marginTop: '1rem', borderLeft: '2px solid #1f1f1f', paddingLeft: '1rem' }}>
            {post.excerptEn}
          </p>
        )}
      </header>

      <hr style={{ border: 'none', borderTop: '1px solid #1f1f1f', marginBottom: '2.5rem' }} />

      {/* Content */}
      <article
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Footer */}
      <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #1f1f1f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <a href="/blog" style={{ fontSize: '0.8125rem', color: 'var(--fg-subtle)' }}>← Back to writing</a>
          <a
            href={`https://x.com/intent/tweet?text=${encodeURIComponent(post.titleEn)}&url=${encodeURIComponent(`https://blog.lincept.com/blog/${post.slug}`)}&via=GuangtaoS29545`}
            target="_blank"
            rel="noopener noreferrer"
            className="x-cta"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            Share on X
          </a>
        </div>
      </div>
    </div>
  );
}