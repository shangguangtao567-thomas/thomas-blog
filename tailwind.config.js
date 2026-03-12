/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0a',
        surface: '#111111',
        border: '#1f1f1f',
        muted: '#3a3a3a',
        subtle: '#6b6b6b',
        secondary: '#999999',
        primary: '#ededed',
        accent: '#ffffff',
        link: '#a8a8a8',
        'link-hover': '#ffffff',
        tag: '#1a1a1a',
        'tag-text': '#888888',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
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
            color: '#ededed',
            maxWidth: '680px',
            lineHeight: '1.75',
            'h1, h2, h3, h4': {
              color: '#ffffff',
              fontWeight: '600',
              letterSpacing: '-0.02em',
            },
            h2: {
              fontSize: '1.2rem',
              marginTop: '2.5rem',
              marginBottom: '0.75rem',
            },
            h3: {
              fontSize: '1.05rem',
              marginTop: '2rem',
              marginBottom: '0.5rem',
            },
            p: {
              marginTop: '1.25rem',
              marginBottom: '1.25rem',
            },
            a: {
              color: '#a8a8a8',
              textDecoration: 'underline',
              textDecorationColor: '#3a3a3a',
              textUnderlineOffset: '3px',
              '&:hover': {
                color: '#ffffff',
                textDecorationColor: '#6b6b6b',
              },
            },
            strong: {
              color: '#ffffff',
              fontWeight: '600',
            },
            code: {
              color: '#ededed',
              backgroundColor: '#1a1a1a',
              borderRadius: '3px',
              padding: '0.15em 0.35em',
              fontSize: '0.875em',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
            pre: {
              backgroundColor: '#111111',
              border: '1px solid #1f1f1f',
              borderRadius: '6px',
              padding: '1.25rem',
            },
            'pre code': {
              backgroundColor: 'transparent',
              padding: '0',
            },
            blockquote: {
              borderLeftColor: '#3a3a3a',
              borderLeftWidth: '2px',
              color: '#888888',
              fontStyle: 'normal',
              paddingLeft: '1rem',
            },
            hr: {
              borderColor: '#1f1f1f',
              marginTop: '2.5rem',
              marginBottom: '2.5rem',
            },
            'ul > li::marker': {
              color: '#3a3a3a',
            },
            'ol > li::marker': {
              color: '#6b6b6b',
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
