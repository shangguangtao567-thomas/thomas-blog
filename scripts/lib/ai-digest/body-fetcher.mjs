import {
  cleanText,
  decodeHtmlEntities,
  sentenceSplit,
  trimText,
  uniqueStrings,
  wordCount,
} from './shared.mjs';

const BODY_FETCH_LIMIT = Number.parseInt(process.env.AI_DIGEST_BODY_FETCH_LIMIT || '5', 10);
const BODY_SCORE_THRESHOLD = Number.parseInt(process.env.AI_DIGEST_BODY_SCORE_THRESHOLD || '78', 10);
const BODY_TIMEOUT_MS = Number.parseInt(process.env.AI_DIGEST_BODY_TIMEOUT_MS || '15000', 10);
const BODY_MAX_CHARS = Number.parseInt(process.env.AI_DIGEST_BODY_MAX_CHARS || '12000', 10);

const SKIP_DOMAINS = /(arxiv\.org|youtube\.com|youtu\.be|x\.com|twitter\.com|reddit\.com)$/i;
const SIGNAL_CONTAINER = /(article|content|entry|post|story|body|markdown|prose|rich-text|article-body|post-content|blog-content|doc-content|main-content)/i;
const NOISE_CONTAINER = /(nav|footer|header|menu|share|social|comment|cookie|banner|newsletter|subscribe|promo|sponsor|ads|related|recommend|breadcrumb|toc|sidebar)/i;
const NOISE_LINE = /^(share|subscribe|newsletter|privacy|cookie|read more|table of contents|advertisement|sign up|all rights reserved|skip to|comments?\b|posted in\b|filed under\b)$/i;

function shouldTargetBody(item, index) {
  return index < BODY_FETCH_LIMIT || (item.score || 0) >= BODY_SCORE_THRESHOLD || (item.priority || 0) >= 9;
}

function removeNoiseBlocks(html = '') {
  let output = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<(header|footer|nav|aside|form|button|picture)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  const attrNoise = new RegExp(`<([a-z0-9]+)\\b[^>]*(?:class|id)=["'][^"']*(?:${NOISE_CONTAINER.source})[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`, 'gi');
  for (let pass = 0; pass < 2; pass += 1) {
    output = output.replace(attrNoise, ' ');
  }

  return output;
}

function blockTextScore(fragment = '') {
  const text = htmlToParagraphs(fragment).join('\n\n');
  const textLength = text.length;
  const paragraphCount = (fragment.match(/<p\b/gi) || []).length;
  const headingCount = (fragment.match(/<h[1-6]\b/gi) || []).length;
  const listCount = (fragment.match(/<li\b/gi) || []).length;
  const linkCount = (fragment.match(/<a\b/gi) || []).length;
  const penalty = Math.min(textLength * 0.45, linkCount * 45);
  return textLength + paragraphCount * 120 + headingCount * 90 + listCount * 30 - penalty;
}

function collectCandidateBlocks(html = '') {
  const blocks = [];
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  const articlePattern = /<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = articlePattern.exec(body))) {
    blocks.push(match[0]);
  }

  const containerPattern = /<(section|div)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((match = containerPattern.exec(body))) {
    const attrs = match[2] || '';
    if (!SIGNAL_CONTAINER.test(attrs) || NOISE_CONTAINER.test(attrs)) continue;
    blocks.push(match[0]);
  }

  if (blocks.length === 0) {
    blocks.push(body);
  }

  return blocks;
}

function htmlToParagraphs(fragment = '') {
  const withBreaks = decodeHtmlEntities(fragment)
    .replace(/<(br|hr)\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|section|article|main|blockquote|pre|table|tr|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  const chunks = withBreaks
    .split(/\n{2,}/)
    .map(chunk => cleanText(chunk))
    .filter(Boolean)
    .filter(chunk => !NOISE_LINE.test(chunk))
    .filter(chunk => chunk.length >= 40 || /^[-•]/.test(chunk));

  return uniqueStrings(chunks);
}

function extractTitle(html = '') {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(titleMatch?.[1] || '');
}

function pickBestBlock(html = '') {
  const blocks = collectCandidateBlocks(removeNoiseBlocks(html));
  const scored = blocks
    .map(fragment => ({
      fragment,
      score: blockTextScore(fragment),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.fragment || html;
}

function extractEvidence(text = '') {
  const candidates = sentenceSplit(text)
    .map(sentence => ({
      sentence,
      score: [
        /\d/.test(sentence) ? 2 : 0,
        /(launch|release|announce|introduce|support|api|sdk|benchmark|open source|context|token|agent|workflow|embedding|multimodal|safety|inference|pricing|availability)/i.test(sentence) ? 2 : 0,
        sentence.length >= 70 && sentence.length <= 220 ? 1 : 0,
      ].reduce((sum, value) => sum + value, 0),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.sentence);

  return uniqueStrings(candidates).slice(0, 3);
}

function summarizeFetch(items = []) {
  const targeted = items.filter(item => item.bodyFetchTargeted).length;
  const succeeded = items.filter(item => item.bodyFetched).length;
  const failed = items.filter(item => item.bodyFetchTargeted && !item.bodyFetched).length;
  return {
    targeted,
    succeeded,
    failed,
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'thomas-blog-ai-digest/2.0 (+https://shangguangtao567-thomas.github.io/thomas-blog)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(BODY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

async function enrichCandidate(item) {
  const cachedBody = cleanText(item.bodyText || '');
  if (cachedBody.length >= 600) {
    return {
      ...item,
      bodyFetched: true,
      bodyFetchStatus: 'cached',
      bodyWordCount: item.bodyWordCount || wordCount(cachedBody),
      bodySummary: item.bodySummary || trimText(cachedBody, 420),
      evidenceSentences: item.evidenceSentences || extractEvidence(cachedBody),
    };
  }

  if (!item.link || SKIP_DOMAINS.test(item.sourceDomain || '')) {
    return {
      ...item,
      bodyFetched: false,
      bodyFetchStatus: 'skipped',
    };
  }

  try {
    const html = await fetchHtml(item.link);
    const fragment = pickBestBlock(html);
    const paragraphs = htmlToParagraphs(fragment);
    const bodyText = cleanText(paragraphs.join('\n\n')).slice(0, BODY_MAX_CHARS);
    const evidenceSentences = extractEvidence(bodyText);

    if (bodyText.length < 280) {
      return {
        ...item,
        bodyFetched: false,
        bodyFetchStatus: 'low-signal',
        pageTitle: extractTitle(html),
      };
    }

    return {
      ...item,
      pageTitle: extractTitle(html),
      bodyText,
      bodySummary: trimText(bodyText, 420),
      bodyParagraphs: paragraphs.slice(0, 8),
      evidenceSentences,
      bodyFetched: true,
      bodyFetchStatus: 'fetched',
      bodyWordCount: wordCount(bodyText),
      bodyFetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...item,
      bodyFetched: false,
      bodyFetchStatus: `failed:${error.message}`,
    };
  }
}

export async function enrichCandidatesWithBodies(candidates = []) {
  const targetedIds = new Set(
    candidates
      .filter((item, index) => shouldTargetBody(item, index))
      .slice(0, BODY_FETCH_LIMIT)
      .map(item => item.id),
  );

  const enriched = [];
  for (const item of candidates) {
    if (!targetedIds.has(item.id)) {
      enriched.push({
        ...item,
        bodyFetchTargeted: false,
        bodyFetched: Boolean(cleanText(item.bodyText || '')),
        bodyFetchStatus: item.bodyFetchStatus || 'skipped',
        bodyWordCount: item.bodyWordCount || wordCount(item.bodyText || ''),
        bodySummary: item.bodySummary || trimText(item.bodyText || '', 420),
        evidenceSentences: item.evidenceSentences || extractEvidence(item.bodyText || item.contentSnippet || ''),
      });
      continue;
    }

    const next = await enrichCandidate({ ...item, bodyFetchTargeted: true });
    enriched.push(next);
  }

  return {
    items: enriched,
    bodyFetch: summarizeFetch(enriched),
  };
}
