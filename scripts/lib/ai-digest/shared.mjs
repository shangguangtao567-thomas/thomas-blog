import fs from 'fs';

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

export function decodeHtmlEntities(text = '') {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&rsquo;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, '"');
}

export function stripHtml(text = '') {
  return decodeHtmlEntities(text)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

export function cleanText(text = '') {
  return stripHtml(text)
    .replace(/[\u00a0\u200b\u200c\u200d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function trimText(text = '', max = 180) {
  const normalized = cleanText(text);
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  const sliced = normalized.slice(0, max);
  const lastStop = Math.max(
    sliced.lastIndexOf('。'),
    sliced.lastIndexOf('；'),
    sliced.lastIndexOf('. '),
    sliced.lastIndexOf('; '),
    sliced.lastIndexOf('，'),
    sliced.lastIndexOf(', '),
    sliced.lastIndexOf(': '),
  );
  const clipped = lastStop > Math.max(48, Math.floor(max * 0.4)) ? sliced.slice(0, lastStop) : sliced;
  return clipped.trim();
}

export function normalizeTitle(title = '') {
  return cleanText(title)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function toIsoDate(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function toIsoDateTime(input) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

export function relativeTimeLabels(input) {
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) {
    return { zh: '', en: '' };
  }

  const hours = Math.max(0, Math.round((Date.now() - ts) / 36e5));
  if (hours < 1) {
    return { zh: '1 小时内', en: 'within 1 hour' };
  }

  if (hours < 24) {
    return {
      zh: `${hours} 小时前`,
      en: `${hours} hour${hours > 1 ? 's' : ''} ago`,
    };
  }

  const days = Math.round(hours / 24);
  return {
    zh: `${days} 天前`,
    en: `${days} day${days > 1 ? 's' : ''} ago`,
  };
}

export function sentenceSplit(text = '') {
  return cleanText(text)
    .split(/(?<=[。！？!?;；.])\s+/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function uniqueStrings(values = []) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const normalized = cleanText(value);
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

export function wordCount(text = '') {
  const normalized = cleanText(text);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

export function escapeFrontmatter(value = '') {
  return String(value).replace(/"/g, '\\"');
}

export function parseArgs(argv = []) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const [key, inlineValue] = token.slice(2).split('=');
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}
