/**
 * LLM-driven narrative generation via `claude --print` CLI.
 *
 * Uses the locally installed Claude Code CLI (which may use Qwen 3.5 or other configured model).
 * No API key needed — inherits the CLI's own authentication.
 *
 * Configuration:
 * - LLM_ENABLED: Set to "1" or "true" to enable (default: false, falls back to templates)
 * - CLAUDE_BIN: Path to claude binary (default: claude)
 * - LLM_TIMEOUT_MS: Timeout per claude call (default: 90000 = 90s)
 * - MAX_ITEMS: Max items to process (default: 6)
 */

import { execFile } from 'node:child_process';
import { cleanText, trimText } from './shared.mjs';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const LLM_ENABLED = process.env.LLM_ENABLED === '1' || process.env.LLM_ENABLED === 'true';
const TIMEOUT_MS = Number.parseInt(process.env.LLM_TIMEOUT_MS || '90000', 10);
const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS || '6', 10);

// Banned phrases for quality gate
const BANNED_PHRASES = [
  /game-changer/i,
  /paradigm shift/i,
  /revolutionize/i,
  /ecosystem/i,
  /landscape/i,
  /exciting/i,
  /groundbreaking/i,
  /stay tuned/i,
  /it remains to be seen/i,
  /^\s*this\b/i,
  /^\s*it\b/i,
  /^\s*the article\b/i,
];

/**
 * Build prompt for per-article narrative generation.
 */
function buildPerArticlePrompt(item) {
  const title = item.title || item.pageTitle || 'Untitled';
  const sourceName = item.sourceName || item.sourceDomain || 'Unknown';
  const body = item.bodyText ? trimText(item.bodyText, 500) : (item.contentSnippet || '');

  return `You write one section of a daily AI briefing for blog.lincept.com.
Readers are senior engineers who ship AI products.

Article: "${title}"
Source: ${sourceName}
Content: ${body}

Write exactly 3 short paragraphs in English AND 3 in Chinese. Each paragraph is 2-3 sentences. No flowery language.

Paragraph 1 — Factual update (NOT "X published Y"):
  Describe what specific thing changed. Include one concrete number or technical detail if available.
  Do NOT editorialize. Do NOT use passive ("it is believed that..."). Write like a technical news brief.
  Include 1 natural keyword phrase for searchability.

Paragraph 2 — Builder impact:
  What specific thing should a practitioner do differently THIS WEEK because of this?
  Be concrete, not philosophical. "Switch to X" or "Add Y to your stack" or "Verify Z claim before using in prod" — not "worth watching".

Paragraph 3 — Signal to watch:
  One falsifiable thing to check. Not a trend — a specific claim, benchmark, or release to look up.

BANNED (EN): "game-changer", "paradigm shift", "ecosystem", "landscape", "exciting", "groundbreaking", "landmark", "notable", "significant"
BANNED (EN): starting sentences with "This", "It", "The article", "This piece", "This update"
BANNED (ZH): "值得关注", "意义重大", "具有重要意义", "不得不说", "让我们拭目以待", "不言而喻", "震撼", "突破性"
BANNED: restating the title or press-release language verbatim
IMPORTANT: Each paragraph must be COMPLETE SENTENCES. Do NOT cut off mid-word. Do NOT reuse sentence patterns across articles.

Output ONLY valid JSON:
{"narrativeEn":["<para1>","<para2>","<para3>"],"narrativeZh":["<para1>","<para2>","<para3>"],"titleEn":"rewrite title to be descriptive and keyword-rich, OR empty string if original title is already clear"}`;
}

/**
 * Build prompt for editorial summary generation.
 */
function buildEditorialSummaryPrompt(items) {
  const articleSummaries = items.map((item, i) => {
    const title = item.title || item.pageTitle || 'Untitled';
    const oneLine = (item.narrativeEn && item.narrativeEn[0]) ? item.narrativeEn[0].slice(0, 100) : 'No summary available';
    return `[${i + 1}] "${title}" — ${oneLine}`;
  }).join('\n');

  return `You are the editor of a daily AI briefing for blog.lincept.com.
Readers are senior engineers who ship AI products.

${articleSummaries}

Write SEO metadata for this briefing:

1. seoTitle: 8-12 words. PRIMARY KEYWORD FIRST. Format: "Primary Keyword | Secondary Topic [AI Daily]". Example: "Local LLM Inference Speeds Up | Enterprise AI Agents Go Mainstream". Do NOT start with "AI Daily". Do NOT repeat the same phrase twice.
2. seoDescription: 120-155 chars. Factual, keyword-rich, drives click-through. Describe what engineers will learn, not how you feel about it. No "today's issue" or "in this issue".
3. keywords: 3-5 comma-separated topic tags (e.g. "local-llm,inference,enterprise-agents,security,open-source")
4. heroSummary: 2 sentences. Write as a factual brief opening paragraph. Start with a concrete fact, not "This issue". No marketing language.

IMPORTANT: seoTitle and seoDescription are used for search engine ranking and social sharing — write for discoverability, not style.

Output ONLY valid JSON:
{"seoTitle":{"en":"...","zh":"..."},"seoDescription":{"en":"...","zh":"..."},"keywords":"tag1,tag2,tag3","heroSummary":{"en":"...","zh":"..."}}`;
}

/**
 * Call claude CLI with a prompt.
 */
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      CLAUDE_BIN,
      ['--print', '--permission-mode', 'bypassPermissions', prompt],
      {
        timeout: TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, NO_COLOR: '1' },
      },
      (error, stdout, stderr) => {
        if (error) {
          if (error.killed) {
            reject(new Error(`claude CLI timed out after ${TIMEOUT_MS}ms`));
          } else {
            reject(new Error(`claude CLI error: ${error.message}${stderr ? ` | stderr: ${stderr.slice(0, 200)}` : ''}`));
          }
          return;
        }
        resolve(stdout);
      },
    );
  });
}

/**
 * Parse JSON response from claude.
 */
function parseJsonResponse(raw, expectedFields = []) {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }
  const parsed = JSON.parse(cleaned);

  for (const field of expectedFields) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return parsed;
}

/**
 * Generate narrative for a single article.
 * @param {Object} item - The article item
 * @returns {Promise<Object|null>} LLM response or null on failure
 */
export async function generatePerArticle(item) {
  if (!LLM_ENABLED) {
    return null;
  }

  try {
    const prompt = buildPerArticlePrompt(item);
    const raw = await callClaude(prompt);
    const parsed = parseJsonResponse(raw, ['narrativeEn']);

    // Validate narrativeEn has exactly 3 non-empty strings
    if (!Array.isArray(parsed.narrativeEn) || parsed.narrativeEn.length !== 3) {
      throw new Error('narrativeEn must be array of 3 strings');
    }
    if (parsed.narrativeEn.some(s => !s || typeof s !== 'string' || s.trim().length < 30)) {
      throw new Error('Each narrative paragraph must be >30 chars');
    }

    // narrativeZh is optional but validate if present
    let narrativeZh = null;
    if (Array.isArray(parsed.narrativeZh) && parsed.narrativeZh.length === 3) {
      narrativeZh = parsed.narrativeZh.map(s => trimText(s, 400)).filter(s => s.length >= 10);
      if (narrativeZh.length !== 3) narrativeZh = null;
    }

    return {
      narrativeEn: parsed.narrativeEn.map(s => trimText(s, 400)),
      narrativeZh,
      titleEn: parsed.titleEn ? trimText(parsed.titleEn, 180) : '',
    };
  } catch (error) {
    console.warn(`[llm-narrative] Per-article failed for "${item.title}": ${error.message}`);
    return null;
  }
}

/**
 * Generate editorial summary from all items.
 * @param {Array<Object>} items - Items with narrativeEn already generated
 * @returns {Promise<Object|null>} LLM response or null on failure
 */
export async function generateEditorialSummary(items) {
  if (!LLM_ENABLED) {
    return null;
  }

  try {
    const prompt = buildEditorialSummaryPrompt(items);
    const raw = await callClaude(prompt);
    const parsed = parseJsonResponse(raw, ['seoTitle', 'seoDescription', 'keywords', 'heroSummary']);

    return {
      seoTitle: {
        en: trimText(parsed.seoTitle?.en || '', 80),
        zh: trimText(parsed.seoTitle?.zh || '', 60),
      },
      seoDescription: {
        en: trimText(parsed.seoDescription?.en || '', 155),
        zh: trimText(parsed.seoDescription?.zh || '', 120),
      },
      keywords: parsed.keywords || 'AI,daily',
      heroSummary: {
        en: trimText(parsed.heroSummary?.en || '', 300),
        zh: trimText(parsed.heroSummary?.zh || '', 200),
      },
    };
  } catch (error) {
    console.warn(`[llm-narrative] Editorial summary failed: ${error.message}`);
    return null;
  }
}

/**
 * Quality gate: validate LLM output before accepting.
 * @param {Array<Object>} items - Items with LLM-generated narratives
 * @returns {Object} { passed, failures: [{index, reason}] }
 */
export function qualityCheck(items) {
  const failures = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const narrative = item.narrativeEn;

    // Check: narrativeEn must have exactly 3 non-empty strings
    if (!Array.isArray(narrative) || narrative.length !== 3) {
      failures.push({ index: i, reason: 'narrativeEn must have exactly 3 strings' });
      continue;
    }

    // Check: no banned phrases
    for (const para of narrative) {
      for (const banned of BANNED_PHRASES) {
        if (banned.test(para)) {
          failures.push({ index: i, reason: `contains banned phrase matching ${banned}` });
          break;
        }
      }
      if (failures.length > 0 && failures[failures.length - 1].index === i) break;
    }

    // Check: each string must be >30 chars
    for (let j = 0; j < narrative.length; j++) {
      if (!narrative[j] || narrative[j].trim().length < 30) {
        failures.push({ index: i, reason: `narrativeEn[${j}] is too short (${narrative[j]?.length || 0} chars)` });
        break;
      }
    }

    // Check: no duplicate content between items (overlap ratio >0.8)
    for (let k = 0; k < i; k++) {
      const otherNarrative = items[k].narrativeEn;
      if (!otherNarrative) continue;

      const words1 = new Set(narrative.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const words2 = new Set(otherNarrative.join(' ').toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const intersection = [...words1].filter(w => words2.has(w)).length;
      const union = new Set([...words1, ...words2]).size;
      const overlap = union > 0 ? intersection / union : 0;

      if (overlap > 0.8) {
        failures.push({ index: i, reason: `duplicate content with item ${k + 1} (overlap: ${(overlap * 100).toFixed(0)}%)` });
        break;
      }
    }
  }

  return { passed: failures.length === 0, failures };
}

/**
 * Generate narratives for all items sequentially.
 * @param {Array<Object>} candidates - Candidate items
 * @returns {Promise<Object|null>} { articles, issueTitle?, heroSummary? } or null if LLM disabled
 */
export async function generateNarrativeWithLLM(candidates) {
  if (!LLM_ENABLED) {
    return null;
  }

  const selectedCandidates = candidates.slice(0, MAX_ITEMS);
  console.log(`[llm-narrative] Processing ${selectedCandidates.length} items sequentially...`);

  const results = [];
  for (let i = 0; i < selectedCandidates.length; i++) {
    const item = selectedCandidates[i];
    console.log(`[llm-narrative] Processing item ${i + 1}/${selectedCandidates.length}: ${item.title?.slice(0, 50) || 'Untitled'}...`);

    const result = await generatePerArticle(item);
    if (result) {
      results.push({
        ...item,
        ...result,
        index: i + 1,
      });
      console.log(`[llm-narrative] Item ${i + 1} done`);
    } else {
      console.warn(`[llm-narrative] Item ${i + 1} failed, will use template fallback`);
      results.push({
        ...item,
        narrativeEn: null,
        narrativeZh: null,
        titleEn: '',
        titleZh: '',
        index: i + 1,
        llmFailed: true,
      });
    }

    // Small delay between calls to avoid rate limits
    if (i < selectedCandidates.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Check if all items failed LLM
  const allFailed = results.every(r => r.llmFailed);
  if (allFailed) {
    console.warn('[llm-narrative] All items failed LLM generation, falling back to templates');
    return null;
  }

  // Only generate editorial summary if at least one item succeeded
  const succeededItems = results.filter(r => !r.llmFailed);
  let editorialSummary = null;

  if (succeededItems.length > 0) {
    console.log('[llm-narrative] Generating editorial summary...');
    editorialSummary = await generateEditorialSummary(succeededItems);
    if (editorialSummary) {
      console.log('[llm-narrative] Editorial summary done');
    } else {
      console.warn('[llm-narrative] Editorial summary failed, will use template fallback');
    }
  }

  // Quality check
  const itemsForQualityCheck = results.filter(r => !r.llmFailed);
  if (itemsForQualityCheck.length > 0) {
    const qualityResult = qualityCheck(itemsForQualityCheck);
    if (!qualityResult.passed) {
      console.warn('[llm-narrative] Quality check failed for some items:');
      for (const failure of qualityResult.failures) {
        console.warn(`  Item ${failure.index + 1}: ${failure.reason}`);
        // Mark failed items for template fallback
        results[failure.index].llmFailed = true;
        results[failure.index].narrativeEn = null;
        results[failure.index].narrativeZh = null;
      }
    }
  }

  return {
    articles: results,
    issueTitle: editorialSummary?.issueTitle,
    heroSummary: editorialSummary?.heroSummary,
  };
}

export function getLLMConfig() {
  return { enabled: LLM_ENABLED, claudeBin: CLAUDE_BIN, timeout: TIMEOUT_MS };
}
