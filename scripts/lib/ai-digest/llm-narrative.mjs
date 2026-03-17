/**
 * LLM-driven narrative generation via `claude --print` CLI.
 *
 * Uses the locally installed Claude Code CLI (which may use Qwen 3.5 or other configured model).
 * No API key needed — inherits the CLI's own authentication.
 *
 * Configuration:
 * - LLM_ENABLED: Set to "1" or "true" to enable (default: false, falls back to templates)
 * - CLAUDE_BIN: Path to claude binary (default: claude)
 */

import { execFile } from 'node:child_process';
import { cleanText, trimText } from './shared.mjs';

const CLAUDE_BIN = process.env.CLAUDE_BIN || 'claude';
const LLM_ENABLED = process.env.LLM_ENABLED === '1' || process.env.LLM_ENABLED === 'true';
const TIMEOUT_MS = Number.parseInt(process.env.LLM_TIMEOUT_MS || '180000', 10);

function buildPrompt(articles) {
  const articlesBlock = articles.map((a, i) => {
    const body = a.bodyText ? trimText(a.bodyText, 600) : (a.contentSnippet || '');
    return `[${i + 1}] "${a.title || a.pageTitle || 'Untitled'}"
Source: ${a.sourceName || a.sourceDomain || 'Unknown'}
Content: ${body}`;
  }).join('\n\n');

  return `You write the daily AI briefing for blog.lincept.com. Readers are senior AI engineers and founders who ship products. They scan dozens of newsletters — yours survives only if every sentence earns its place.

Here are today's articles:

${articlesBlock}

---

For EACH article write exactly 3 short paragraphs (English) and 3 short paragraphs (Chinese):
1. What shifted — NOT "X published Y" or "X released Y". Instead: what capability, assumption, or constraint actually changed? Be concrete.
2. Builder impact — how does this change what a practitioner would do THIS WEEK? Name the workflow, tool, or decision affected.
3. Signal to watch — one specific, falsifiable prediction or metric. Not "adoption will grow" — name the thing to check.

BANNED phrases: "game-changer", "paradigm shift", "revolutionize", "ecosystem", "landscape", "exciting", "groundbreaking", "stay tuned", "it remains to be seen"
BANNED patterns: starting with "This", "It", "The article"; restating the title; press-release tone

Chinese (中文) paragraphs should be written for Chinese AI practitioners. Do NOT translate from English — write independently with Chinese-specific context where relevant (mention domestic alternatives, local adoption patterns, etc.).

Also write:
- issueTitle: a sharp 8-12 word English title + 中文标题 that captures today's SPECIFIC theme (never reusable across days)
- heroSummary: 2-sentence English + 中文 overview connecting the articles. What pattern links them?

Output ONLY valid JSON (no markdown fences, no commentary):

{"issueTitle":{"en":"...","zh":"..."},"heroSummary":{"en":"...","zh":"..."},"articles":[{"index":1,"narrativeEn":["what shifted","builder impact","signal"],"narrativeZh":["变化","影响","信号"],"titleEn":"...","titleZh":"..."}]}`;
}

function parseResponse(raw) {
  // Strip markdown fences if model wraps in ```json ... ```
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  // Validate structure
  if (!parsed.issueTitle?.en || !parsed.heroSummary?.en || !Array.isArray(parsed.articles)) {
    throw new Error('Missing required fields in LLM response');
  }

  for (const article of parsed.articles) {
    if (!Array.isArray(article.narrativeEn) || article.narrativeEn.length !== 3) {
      throw new Error(`Article ${article.index}: narrativeEn must be array of 3 strings`);
    }
    if (!Array.isArray(article.narrativeZh) || article.narrativeZh.length !== 3) {
      throw new Error(`Article ${article.index}: narrativeZh must be array of 3 strings`);
    }
  }

  return parsed;
}

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

export async function generateNarrativeWithLLM(articles) {
  if (!LLM_ENABLED) {
    return null;
  }

  try {
    const prompt = buildPrompt(articles.slice(0, 6));
    console.log('[llm-narrative] Calling claude CLI...');
    const raw = await callClaude(prompt);
    console.log(`[llm-narrative] Got response (${raw.length} chars)`);

    const parsed = parseResponse(raw);

    return {
      issueTitle: {
        en: trimText(parsed.issueTitle.en, 100),
        zh: trimText(parsed.issueTitle.zh, 60),
      },
      heroSummary: {
        en: trimText(parsed.heroSummary.en, 300),
        zh: trimText(parsed.heroSummary.zh, 200),
      },
      articles: parsed.articles.map(a => ({
        index: a.index,
        narrativeEn: a.narrativeEn.map(s => trimText(s, 220)),
        narrativeZh: a.narrativeZh.map(s => trimText(s, 140)),
        titleEn: a.titleEn ? trimText(a.titleEn, 120) : '',
        titleZh: a.titleZh ? trimText(a.titleZh, 60) : '',
      })),
    };
  } catch (error) {
    console.warn('[llm-narrative] Failed, falling back to templates:', error.message);
    return null;
  }
}

export function getLLMConfig() {
  return { enabled: LLM_ENABLED, claudeBin: CLAUDE_BIN, timeout: TIMEOUT_MS };
}
