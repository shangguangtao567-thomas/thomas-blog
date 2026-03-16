/**
 * LLM-driven narrative generation for AI daily digest.
 *
 * This module replaces the template-based narrative generation with actual LLM calls.
 * It supports any OpenAI-compatible API endpoint.
 *
 * Configuration via environment variables:
 * - LLM_API_KEY: API key for the LLM provider
 * - LLM_API_ENDPOINT: API endpoint URL (default: https://api.openai.com/v1/chat/completions)
 * - LLM_MODEL: Model name (default: gpt-4o-mini)
 * - LLM_ENABLED: Set to "1" or "true" to enable LLM generation
 */

import { cleanText, trimText } from './shared.mjs';

const LLM_CONFIG = {
  apiKey: process.env.LLM_API_KEY || '',
  endpoint: process.env.LLM_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
  model: process.env.LLM_MODEL || 'gpt-4o-mini',
  enabled: process.env.LLM_ENABLED === '1' || process.env.LLM_ENABLED === 'true',
  timeout: Number.parseInt(process.env.LLM_TIMEOUT_MS || '30000', 10),
  maxTokens: Number.parseInt(process.env.LLM_MAX_TOKENS || '1200', 10),
};

const SYSTEM_PROMPT = `You are an AI industry analyst writing for practitioners. Your task is to write brief, opinionated analysis of AI news - not summaries, but insights about what changed, why it matters, and what to watch next.

Tone guidelines:
- Direct and confident, like a knowledgeable insider
- No marketing speak, no press release language
- No SEO fluff or generic statements
- Focus on real-world implications for builders and companies
- Be specific when you can, skip obvious points

Output format:
Write your analysis in the following structure:

ENGLISH:
- whatChanged: 1-2 sentences on what actually happened
- whyItMatters: 1-2 sentences on why practitioners should care
- watchNext: 1 sentence on what signals to track

CHINESE (中文):
- whatChanged: 1-2 句关于实际变化的分析
- whyItMatters: 1-2 句关于为什么从业者应该关心的见解
- watchNext: 1 句关于接下来应该关注什么信号

Keep each section concise - no more than 3 sentences each. The English and Chinese should convey the same insights but are NOT direct translations of each other.`;

function buildPrompt(articles) {
  const articleContext = articles.map((article, index) => {
    const bodyContext = article.bodyText
      ? `\n    Full article excerpt: "${trimText(article.bodyText, 800)}"`
      : `\n    Snippet: "${article.contentSnippet || 'No content available'}"`;

    return `### Article ${index + 1}
- Title: ${article.title || article.pageTitle || 'Untitled'}
- Source: ${article.sourceName || article.sourceDomain || 'Unknown'}
- Category: ${article.categoryHint || 'AI'}${bodyContext}`;
  }).join('\n\n');

  return `Analyze these AI news items and write opinionated analysis for each:

${articleContext}

For each article, provide:
1. What actually changed (not just "what was announced" - what shifted in the landscape)
2. Why it matters for people building with AI (not investors, not enterprises generally - builders)
3. What to watch next (specific signals, not vague "adoption" talk)

Also write a brief hero summary (2-3 sentences) that ties the articles together into a coherent narrative about what's happening in AI right now.

And suggest an issue title that captures the main theme - something a practitioner would find interesting, not clickbait.`;
}

function parseLLMResponse(responseText) {
  const result = {
    english: { whatChanged: '', whyItMatters: '', watchNext: '' },
    chinese: { whatChanged: '', whyItMatters: '', watchNext: '' },
    heroSummary: { en: '', zh: '' },
    issueTitle: { en: '', zh: '' },
    parseError: null,
  };

  try {
    const lines = responseText.split('\n').filter(line => line.trim());

    let currentSection = null;
    let currentLang = null;
    let currentField = null;
    let buffer = [];

    function flushBuffer() {
      if (buffer.length > 0 && currentLang && currentField) {
        const text = cleanText(buffer.join(' '));
        if (currentLang === 'en' && result.english[currentField]) {
          result.english[currentField] += ' ' + text;
        } else if (currentLang === 'zh' && result.chinese[currentField]) {
          result.chinese[currentField] += ' ' + text;
        }
        buffer = [];
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();

      if (/^#{1,3}\s*(English|英文|ENGLISH)/i.test(trimmed)) {
        flushBuffer();
        currentLang = 'en';
        continue;
      }

      if (/^#{1,3}\s*(Chinese|中文|CHINESE)/i.test(trimmed)) {
        flushBuffer();
        currentLang = 'zh';
        continue;
      }

      if (/^(?:###?\s*)?What Changed/i.test(trimmed)) {
        flushBuffer();
        currentField = 'whatChanged';
        const afterMatch = trimmed.replace(/^(?:###?\s*)?What Changed[:\s]*/i, '').trim();
        if (afterMatch) buffer.push(afterMatch);
        continue;
      }

      if (/^(?:###?\s*)?Why It Matters/i.test(trimmed)) {
        flushBuffer();
        currentField = 'whyItMatters';
        const afterMatch = trimmed.replace(/^(?:###?\s*)?Why It Matters[:\s]*/i, '').trim();
        if (afterMatch) buffer.push(afterMatch);
        continue;
      }

      if (/^(?:###?\s*)?Watch Next/i.test(trimmed)) {
        flushBuffer();
        currentField = 'watchNext';
        const afterMatch = trimmed.replace(/^(?:###?\s*)?Watch Next[:\s]*/i, '').trim();
        if (afterMatch) buffer.push(afterMatch);
        continue;
      }

      if (/^(?:###?\s*)?Hero Summary|^(?:###?\s*)?Issue Title/i.test(trimmed)) {
        flushBuffer();
        if (/Hero Summary/i.test(trimmed)) {
          currentField = 'heroSummary';
        } else {
          currentField = 'issueTitle';
        }
        const afterMatch = trimmed.replace(/^(?:###?\s*)?Hero Summary[:\s]*|^(?:###?\s*)?Issue Title[:\s]*/i, '').trim();
        if (afterMatch) buffer.push(afterMatch);
        continue;
      }

      if (buffer.length > 0 || currentField) {
        buffer.push(trimmed);
      }
    }

    flushBuffer();

    if (!result.english.whatChanged && !result.chinese.whatChanged) {
      result.parseError = 'Could not parse whatChanged from LLM response';
    }
  } catch (err) {
    result.parseError = err.message;
  }

  return result;
}

async function callLLM(prompt) {
  if (!LLM_CONFIG.apiKey) {
    throw new Error('LLM_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LLM_CONFIG.timeout);

  try {
    const response = await fetch(LLM_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LLM_CONFIG.apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_CONFIG.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: LLM_CONFIG.maxTokens,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`LLM API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('LLM returned empty response');
    }

    return parseLLMResponse(content);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`LLM request timed out after ${LLM_CONFIG.timeout}ms`);
    }
    throw error;
  }
}

export async function generateNarrativeWithLLM(articles) {
  if (!LLM_CONFIG.enabled || !LLM_CONFIG.apiKey) {
    return null;
  }

  try {
    const prompt = buildPrompt(articles.slice(0, 6));
    const result = await callLLM(prompt);

    if (result.parseError) {
      console.warn('[llm-narrative] Parse error:', result.parseError);
      return null;
    }

    return {
      english: {
        whatChanged: trimText(result.english.whatChanged, 220),
        whyItMatters: trimText(result.english.whyItMatters, 220),
        watchNext: trimText(result.english.watchNext, 220),
      },
      chinese: {
        whatChanged: trimText(result.chinese.whatChanged, 140),
        whyItMatters: trimText(result.chinese.whyItMatters, 140),
        watchNext: trimText(result.chinese.watchNext, 140),
      },
      heroSummary: {
        en: trimText(result.heroSummary.en, 180),
        zh: trimText(result.heroSummary.zh, 120),
      },
      issueTitle: {
        en: result.issueTitle.en || '',
        zh: result.issueTitle.zh || '',
      },
    };
  } catch (error) {
    console.warn('[llm-narrative] LLM call failed, falling back to templates:', error.message);
    return null;
  }
}

export function getLLMConfig() {
  return LLM_CONFIG;
}
