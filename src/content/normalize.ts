import { marked } from 'marked';

marked.setOptions({ gfm: true });

function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function titlesOverlap(left = '', right = '') {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  if (normalizedLeft.startsWith('ai daily') && normalizedRight.startsWith('ai daily')) return true;

  const wordsLeft = normalizedLeft.split(/\s+/);
  const wordsRight = normalizedRight.split(/\s+/);
  const minLen = Math.min(wordsLeft.length, wordsRight.length);
  if (minLen >= 4) {
    let shared = 0;
    for (let i = 0; i < minLen; i += 1) {
      if (wordsLeft[i] !== wordsRight[i]) break;
      shared += 1;
    }

    if (shared >= 4 && shared >= minLen * 0.5) return true;
  }

  return false;
}

export function stripLeadingH1(markdown = '', title = '') {
  const match = String(markdown).match(/^\s*#\s+(.+?)\s*(?:\n|$)/);
  if (!match || !titlesOverlap(match[1], title)) return markdown;
  return String(markdown).replace(/^\s*#\s+.+?\s*(?:\n+|$)/, '');
}

export function stripDigestSignature(markdown = '') {
  return String(markdown).replace(/\n+(?:---\s*\n+)?\*?AI\s+Daily\s*\|[^\n]*\*?\s*$/i, '');
}

export function bodyContainsImage(markdown = '', imagePath = '') {
  const normalizedPath = String(imagePath || '').trim();
  if (!markdown || !normalizedPath) return false;
  return markdown.includes(`](${normalizedPath})`) || markdown.includes(`src="${normalizedPath}"`);
}

export function enhanceArticleHtml(html = '') {
  return String(html || '').replace(/<img\b([^>]*)>/gi, (_match, attrs = '') => {
    let nextAttrs = attrs;
    if (!/\bloading=/.test(nextAttrs)) nextAttrs += ' loading="lazy"';
    if (!/\bdecoding=/.test(nextAttrs)) nextAttrs += ' decoding="async"';
    return `<img${nextAttrs}>`;
  });
}

export function stripLeadingHtmlH1(html = '', title = '') {
  const match = String(html).match(/^\s*<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
  if (!match || !titlesOverlap(match[1], title)) return html;
  return String(html).replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
}

export function stripMarkdownForPreview(text = '') {
  return String(text || '')
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

export function truncateText(text = '', max = 180) {
  const normalized = stripMarkdownForPreview(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trim()}...`;
}

export function normalizePublishedAt(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function formatDisplayDate(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatBriefDate(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCompactDate(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
}

export function formatMonthDay(dateStr = '') {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function renderMarkdownHtml(markdown = '', title = '', options: { digest?: boolean } = {}) {
  const source = options.digest
    ? stripDigestSignature(stripLeadingH1(markdown, title))
    : stripLeadingH1(markdown, title);
  const rendered = marked.parse(source || '');
  const html = typeof rendered === 'string' ? rendered : '';
  return enhanceArticleHtml(stripLeadingHtmlH1(html, title));
}
