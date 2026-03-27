/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--bg-card)',
        border: 'var(--border)',
        muted: 'var(--fg-faint)',
        subtle: 'var(--fg-subtle)',
        secondary: 'var(--fg-muted)',
        primary: 'var(--fg)',
        accent: 'var(--accent)',
        link: 'var(--link)',
        'link-hover': 'var(--link-hover)',
        tag: 'var(--accent-soft)',
        'tag-text': 'var(--accent)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        display: [
          'Space Grotesk',
          'Inter',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'monospace',
        ],
      },
      maxWidth: {
        prose: '680px',
        wide: '860px',
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'var(--fg-muted)',
            maxWidth: '680px',
            lineHeight: '1.84',
            'h1, h2, h3, h4': {
              color: 'var(--fg)',
              fontFamily: 'var(--font-display)',
              fontWeight: '700',
              letterSpacing: '-0.03em',
            },
            h2: {
              fontSize: '1.5rem',
              marginTop: '2.6rem',
              marginBottom: '0.85rem',
              paddingBottom: '0.5rem',
              borderBottom: '1px solid var(--border)',
            },
            h3: {
              fontSize: '1.22rem',
              marginTop: '2rem',
              marginBottom: '0.75rem',
            },
            p: {
              marginTop: '1.05rem',
              marginBottom: '1.05rem',
            },
            a: {
              color: 'var(--link)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--link-decoration)',
              textUnderlineOffset: '3px',
              '&:hover': {
                color: 'var(--link-hover)',
                textDecorationColor: 'var(--link-decoration-hover)',
              },
            },
            strong: {
              color: 'var(--fg)',
              fontWeight: '700',
            },
            code: {
              color: 'var(--accent-strong)',
              backgroundColor: 'var(--code-bg)',
              borderRadius: '0.45rem',
              padding: '0.12em 0.38em',
              fontSize: '0.84em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: 'var(--code-bg)',
              border: '1px solid var(--border)',
              borderRadius: '1rem',
              padding: '1.2rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
              color: 'var(--fg-muted)',
            },
            blockquote: {
              borderLeftColor: 'var(--accent)',
              borderLeftWidth: '3px',
              color: 'var(--fg-muted)',
              fontStyle: 'normal',
              paddingLeft: '1.2rem',
              background: 'var(--accent-soft)',
              borderRadius: '0 0.75rem 0.75rem 0',
              padding: '0.8rem 0 0.8rem 1.2rem',
            },
            hr: {
              borderColor: 'var(--border)',
              marginTop: '2.25rem',
              marginBottom: '2.25rem',
            },
            'ul > li::marker': {
              color: 'var(--accent)',
            },
            'ol > li::marker': {
              color: 'var(--accent)',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
