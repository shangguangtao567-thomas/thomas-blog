import {
  cleanText,
  escapeFrontmatter,
  relativeTimeLabels,
  sentenceSplit,
  trimText,
  uniqueStrings,
  wordCount,
} from './shared.mjs';
import { generateNarrativeWithLLM } from './llm-narrative.mjs';

// Official sources that get a boost
const OFFICIAL_SOURCES = ['openai.com', 'openai', 'google', 'google.com', 'anthropic.com', 'anthropic', 'github.com', 'github.blog', 'huggingface.co', 'huggingface'];

/**
 * Score a candidate item for inclusion priority.
 * Higher score = more likely to be selected.
 */
export function scoreCandidate(item) {
  const title = cleanText(item.title || item.pageTitle || '');
  const sourceDomain = cleanText(item.sourceDomain || '').toLowerCase();

  // Signal: +3 if title contains specific product/model/tool name (not generic "AI")
  const specificProductPatterns = [
    /gpt-[45o]/i, /claude [34]/i, /gemini [12]/i, /llama [23]/i, /mistral/i, /qwen/i,
    /copilot/i, /notebooklm/i, /learnfm/i, /deepresearch/i, /agent/i, /sdk/i, /api/i,
    /robotics/i, /embedding/i, /multimodal/i, /reasoning/i, /workflow/i,
    /\b(?:model|inference|checkpoint|release|launch)\b/i,
  ];
  const signalScore = specificProductPatterns.some(p => p.test(title)) ? 3 : 0;

  // Freshness: proportional to hours since publish (more recent = higher)
  const published = new Date(item.pubDate || item.publishedAt || Date.now()).getTime();
  const ageHours = Math.max(0, (Date.now() - published) / 36e5);
  const freshnessScore = Math.max(0, 10 - ageHours * 0.5); // 10 pts at 0h, 0 pts at 20h+

  // Source authority: +2 for official sources
  const sourceAuthorityScore = OFFICIAL_SOURCES.some(s => sourceDomain.includes(s)) ? 2 : 0;

  // Title specificity: -2 if title is >15 words (likely SEO junk)
  const wordCount = title.split(/\s+/).length;
  const specificityPenalty = wordCount > 15 ? -2 : 0;

  // Base score from existing priority
  const baseScore = (item.priority || 1) * 3;

  const total = baseScore + signalScore + freshnessScore + sourceAuthorityScore + specificityPenalty;
  return Math.round(total * 10) / 10;
}

/**
 * Semantic title deduplication.
 * If two titles share >80% word overlap, keep the higher-scored one.
 */
export function titleSimilarityScore(title1, title2) {
  const normalize = (t) => {
    const cleaned = cleanText(t).toLowerCase();
    // Remove common stopwords and punctuation
    const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'after', 'before', 'when', 'whenever', 'where', 'wherever', 'whether', 'which', 'whichever', 'who', 'whoever', 'whom', 'whomever', 'whose', 'what', 'whatever', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs']);
    const words = cleaned.replace(/[^a-z0-9\u4e00-\u9fff\s]/g, '').split(/\s+/).filter(w => w.length > 1 && !stopwords.has(w));
    return new Set(words);
  };

  const words1 = normalize(title1);
  const words2 = normalize(title2);

  if (words1.size === 0 || words2.size === 0) return 0;

  // Check for exact match or containment
  const str1 = [...words1].sort().join(' ');
  const str2 = [...words2].sort().join(' ');
  if (str1 === str2) return 1;
  if (str1.includes(str2) || str2.includes(str1)) return 0.9;

  // Calculate word overlap ratio
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Two-layer deduplication: URL dedup + semantic title dedup.
 */
export function dedupeCandidates(items) {
  const seenLinks = new Set();
  const result = [];

  for (const item of items) {
    const link = item.link || item.sourceUrl;
    if (!link || seenLinks.has(link)) continue;

    const titleKey = cleanText(item.title || item.titleZh || item.titleEn || '');
    if (!titleKey) continue;

    // Check semantic similarity with existing items
    let isDuplicate = false;
    for (const existing of result) {
      const existingTitle = cleanText(existing.title || existing.titleZh || existing.titleEn || '');
      if (titleSimilarityScore(titleKey, existingTitle) > 0.8) {
        // Keep higher-scored one
        if ((item.score || 0) <= (existing.score || 0)) {
          isDuplicate = true;
        } else {
          // Replace existing with this one
          Object.assign(existing, item);
        }
        break;
      }
    }

    if (!isDuplicate) {
      seenLinks.add(link);
      result.push(item);
    }
  }

  return result;
}

const THEME_RULES = [
  {
    key: 'safety',
    tag: 'Security',
    themeZh: '模型安全与可控性',
    themeEn: 'Model safety and controllability',
    keywords: ['instruction hierarchy', 'prompt injection', 'safety', 'guardrail', 'jailbreak', 'policy', 'alignment', 'steerability'],
    whyZh: '这类进展会直接影响模型在真实产品里能否稳定遵循高优先级指令，是企业接入、Agent 可控性和高风险场景落地的基础。',
    whyEn: 'This changes whether models can be trusted to follow the right instructions under pressure, which is foundational for enterprise use, controllable agents, and higher-risk deployments.',
    watchZh: '接下来要看它会不会进入 API、系统提示策略和公开评测基线，而不只是停留在研究展示。',
    watchEn: 'The next question is whether this moves into APIs, policy controls, and shared eval baselines instead of remaining a research-side result.',
    focusZh: '让模型在复杂提示冲突里更可控',
    focusEn: 'making models more controllable under conflicting instructions',
    topicZh: '安全控制与指令层级',
    topicEn: 'safety controls and instruction hierarchy',
  },
  {
    key: 'agents-tools',
    tag: 'Tools',
    themeZh: 'Agent 与开发者工具',
    themeEn: 'Agents and developer tooling',
    keywords: ['agent', 'workflow', 'copilot', 'sdk', 'developer', 'cli', 'tool use', 'tooling', 'execution', 'automation', 'app building', 'coding'],
    whyZh: '行业竞争点正在从"聊天回答得好不好"转向"能不能稳定接进软件、工具链和自动化流程"，这决定了真正的生产力入口。',
    whyEn: 'The competition is moving from chat quality to whether models can sit inside software, tooling, and automation without breaking the workflow around them.',
    watchZh: '后续要看它是否被嵌进真实产品和开发者工作流，以及生态是否围绕它形成新的分发与集成方式。',
    watchEn: 'What matters next is whether these ideas become default plumbing inside products and developer stacks, not just good demos.',
    focusZh: '把模型能力变成可编排的执行链路',
    focusEn: 'turning model capability into orchestrated execution workflows',
    topicZh: 'Agent 工作流与开发工具',
    topicEn: 'agent workflows and developer tooling',
  },
  {
    key: 'retrieval-multimodal',
    tag: 'Data',
    themeZh: '检索、多模态与记忆系统',
    themeEn: 'Retrieval, multimodal, and memory systems',
    keywords: ['embedding', 'retrieval', 'rag', 'vector', 'multimodal', 'image', 'video', 'audio', 'memory', 'search', 'document'],
    whyZh: '这类底层能力决定搜索、推荐、知识库和多模态检索系统的可用性，很多 AI 产品体验的上限取决于这里。',
    whyEn: 'These lower-layer changes set the ceiling for search, recommendation, knowledge systems, and cross-modal retrieval. A lot of product quality is decided here.',
    watchZh: '接下来要看效果、成本和工具链支持是否拉开差距，以及企业知识库、RAG 和跨模态搜索是否快速跟进。',
    watchEn: 'Watch for a real gap in quality, cost, and tooling support - and whether enterprise knowledge systems actually retool around it.',
    focusZh: '提升非结构化信息进入同一检索空间的能力',
    focusEn: 'bringing more unstructured data into the same retrieval space',
    topicZh: '多模态检索与记忆',
    topicEn: 'multimodal retrieval and memory',
  },
  {
    key: 'products',
    tag: 'AI',
    themeZh: 'AI 产品体验',
    themeEn: 'AI product experience',
    keywords: ['chatgpt', 'gemini', 'claude', 'copilot chat', 'students', 'learn', 'math', 'science', 'education', 'workspace', 'sheets', 'consumer'],
    whyZh: '当能力真正进入用户日常动作时，竞争会从模型分数转向使用深度、留存、交互设计和默认入口。',
    whyEn: 'Once capability lands inside everyday behavior, the real contest shifts to usage depth, habit formation, interaction design, and default entry points.',
    watchZh: '后续重点是看用户行为是否改变：是否更频繁打开、是否形成新的工作习惯、是否带来付费或留存提升。',
    watchEn: 'The next signal is behavior: more frequent use, new habits, and eventually some retention or monetization proof.',
    focusZh: '把 AI 能力做成可重复使用的产品体验',
    focusEn: 'turning capability into repeatable product behavior',
    topicZh: '产品体验升级',
    topicEn: 'product experience upgrades',
  },
  {
    key: 'open-models',
    tag: 'Open Source',
    themeZh: '开源模型与生态',
    themeEn: 'Open models and ecosystems',
    keywords: ['open source', 'open model', 'apache', 'mit license', 'weights', 'hugging face', 'model card', 'community'],
    whyZh: '开源动作通常会改变谁能拿到能力、以什么成本落地，以及外围生态会围绕哪些模型和工具形成共识。',
    whyEn: 'Open releases reshape who gets access, at what cost, and which models or tools the broader ecosystem starts to standardize around.',
    watchZh: '重点看许可证、部署门槛、社区跟进速度，以及是否出现围绕它的新工具链和最佳实践。',
    watchEn: 'Watch the license, deployment threshold, community uptake, and whether new tooling and best practices gather around it.',
    focusZh: '把能力扩散到更广的开发者和本地部署场景',
    focusEn: 'spreading capability across more developers and local deployment scenarios',
    topicZh: '开源生态与模型扩散',
    topicEn: 'open ecosystems and model diffusion',
  },
  {
    key: 'infra',
    tag: 'Infrastructure',
    themeZh: 'AI 基础设施',
    themeEn: 'AI infrastructure',
    keywords: ['gpu', 'inference', 'storage', 'server', 'cloud', 'datacenter', 'throughput', 'latency', 'infra', 'deployment', 'cluster'],
    whyZh: '基础设施变化往往决定成本、吞吐、协作和交付速度，虽然不总是最吸睛，但对团队能否大规模落地最关键。',
    whyEn: 'Infrastructure shifts decide cost, throughput, delivery speed, and how much friction real deployment still carries.',
    watchZh: '接下来要看这类能力会不会真正进入默认工作流，以及是否显著改变推理成本、部署复杂度或数据协同方式。',
    watchEn: 'Watch whether this becomes default workflow plumbing and materially changes inference cost, deployment complexity, or data collaboration.',
    focusZh: '降低规模化部署的摩擦',
    focusEn: 'reducing friction in scaled deployment',
    topicZh: '部署、算力与数据基础设施',
    topicEn: 'deployment, compute, and data infrastructure',
  },
  {
    key: 'data-eval',
    tag: 'Data',
    themeZh: '数据与评测基础设施',
    themeEn: 'Data and evaluation infrastructure',
    keywords: ['dataset', 'benchmark', 'evaluation', 'open data', 'leaderboard', 'training data', 'eval'],
    whyZh: '数据供给和评测标准决定模型上限，也会重新定义大家如何比较能力、优化训练和挑选路线。',
    whyEn: 'Data supply and evaluation standards shape the ceiling of models, and they also redefine how teams compare progress and choose directions.',
    watchZh: '值得继续跟进的是：它会不会被社区广泛复用，是否成为新的默认比较口径。',
    watchEn: 'The real question is whether the community reuses it enough for it to become part of the default comparison stack.',
    focusZh: '提高训练与比较的可复用性',
    focusEn: 'making training and comparison more reusable',
    topicZh: '数据与评测基线',
    topicEn: 'data and evaluation baselines',
  },
  {
    key: 'research',
    tag: 'AI',
    themeZh: '前沿研究与能力边界',
    themeEn: 'Frontier research and capability shifts',
    keywords: ['research', 'paper', 'frontier', 'reasoning', 'training', 'model', 'capability', 'challenge'],
    whyZh: '研究型更新不一定会马上产品化，但它能提示下一阶段能力边界正在往哪边移动。',
    whyEn: 'Research updates do not always become products quickly, but they often tell you where the capability frontier is starting to bend.',
    watchZh: '要看后续是否出现复现、开源实现、API 化，或者被头部产品吸收进默认能力。',
    watchEn: 'The next step to watch is replication, open implementation, API exposure, or absorption into mainstream products.',
    focusZh: '推动能力边界继续外扩',
    focusEn: 'pushing the capability frontier outward',
    topicZh: '研究前沿',
    topicEn: 'research frontier',
  },
];

const GLOSSARY = [
  ['instruction hierarchy', '指令层级'],
  ['prompt injection', '提示注入'],
  ['interactive visual explanations', '交互式可视化讲解'],
  ['math and science', '数学与科学'],
  ['multimodal embedding', '多模态嵌入'],
  ['embedding model', '嵌入模型'],
  ['agentic workflows', 'Agent 工作流'],
  ['developer workflows', '开发者工作流'],
  ['open data', '开放数据'],
  ['retrieval', '检索'],
  ['multimodal', '多模态'],
  ['memory', '记忆'],
  ['copilot sdk', 'Copilot SDK'],
  ['benchmark', '基准测试'],
  ['evaluation', '评测'],
  ['open source', '开源'],
  ['context window', '上下文窗口'],
  ['workflow', '工作流'],
  ['reasoning', '推理'],
  ['inference', '推理'],
  ['safety', '安全'],
  ['guardrail', '护栏'],
  ['dataset', '数据集'],
  ['google sheets', 'Google 表格'],
];

const ACTOR_PATTERNS = [
  [/openai/i, 'OpenAI'],
  [/google|gemini/i, 'Google'],
  [/github/i, 'GitHub'],
  [/hugging face|hf/i, 'Hugging Face'],
  [/microsoft/i, 'Microsoft'],
  [/nvidia/i, 'NVIDIA'],
  [/meta/i, 'Meta'],
  [/anthropic|claude/i, 'Anthropic'],
  [/deepseek/i, 'DeepSeek'],
  [/qwen|alibaba/i, 'Alibaba'],
  [/mistral/i, 'Mistral'],
  [/perplexity/i, 'Perplexity'],
  [/xai|grok/i, 'xAI'],
  [/berkeley|bair/i, 'Berkeley AI'],
];

const ACTION_RULES = [
  ['open-source', /(open source|open-sourc|apache|mit license|weights available|released .* weights)/i],
  ['integration', /(sdk|api|workflow|integrat|plugin|extension|inside your applications|inside .*product|workspace|sheets)/i],
  ['research', /(paper|research|study|challenge|evaluation|benchmark|frontier|reasoning)/i],
  ['tutorial', /(tutorial|guide|how to|walkthrough|builds?)/i],
  ['commercial', /(enterprise|pricing|business|commercial|team|workspace)/i],
  ['release', /(launch|introduc|announce|release|rollout|new ways|debuts?)/i],
  ['benchmark', /(state-of-the-art|leaderboard|benchmark|sota|outperform)/i],
];

function containsChinese(text = '') {
  return /[\u3400-\u9fff]/.test(text);
}

function replaceTermsZh(text = '') {
  let output = cleanText(text);
  for (const [en, zh] of GLOSSARY.sort((a, b) => b[0].length - a[0].length)) {
    const pattern = new RegExp(en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    output = output.replace(pattern, zh);
  }
  return output.replace(/\s+/g, ' ').trim();
}

function matchRule(text = '', keywords = []) {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? 3 : 0), 0);
}

function inferTheme(item) {
  const haystack = cleanText([
    item.title,
    item.pageTitle,
    item.contentSnippet,
    item.bodyText,
    item.reason,
    item.categoryHint,
    item.sourceName,
  ].filter(Boolean).join(' ')).toLowerCase();

  let best = THEME_RULES[THEME_RULES.length - 1];
  let bestScore = -1;
  for (const rule of THEME_RULES) {
    const score = matchRule(haystack, rule.keywords) + (rule.tag === item.categoryHint ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = rule;
    }
  }
  return best;
}

function inferActor(item) {
  const haystack = cleanText([item.title, item.pageTitle, item.sourceName, item.sourceDomain].filter(Boolean).join(' '));
  for (const [pattern, actor] of ACTOR_PATTERNS) {
    if (pattern.test(haystack)) return actor;
  }
  return cleanText(item.sourceName || item.sourceDomain || 'The source');
}

function inferAction(text = '') {
  for (const [action, pattern] of ACTION_RULES) {
    if (pattern.test(text)) return action;
  }
  return 'update';
}

function pickTopicLabels(text = '', theme) {
  const lowered = text.toLowerCase();
  const matches = [];
  for (const [en, zh] of GLOSSARY) {
    if (lowered.includes(en)) matches.push({ en, zh });
  }
  return {
    topicEn: uniqueStrings(matches.slice(0, 2).map(match => match.en)).join(' and ') || theme.topicEn,
    topicZh: uniqueStrings(matches.slice(0, 2).map(match => match.zh)).join('、') || theme.topicZh,
  };
}

function pickEvidenceSentences(item) {
  const evidence = uniqueStrings([
    ...(item.evidenceSentences || []),
    ...sentenceSplit(item.bodySummary || ''),
    ...sentenceSplit(item.contentSnippet || ''),
  ]);
  return evidence.filter(line => line.length >= 28).slice(0, 3);
}

function normalizePhraseCase(text = '') {
  return cleanText(text)
    .replace(/\bAI\b/gi, 'AI')
    .replace(/\bOpenAI\b/gi, 'OpenAI')
    .replace(/\bChatGPT\b/gi, 'ChatGPT')
    .replace(/\bGitHub\b/gi, 'GitHub')
    .replace(/\bGoogle\b/gi, 'Google')
    .replace(/\bGemini\b/gi, 'Gemini')
    .replace(/\bHugging Face\b/gi, 'Hugging Face')
    .trim();
}

function clipEvidence(text = '', max = 110) {
  return trimText(cleanText(text).replace(/[。；;:]$/, ''), max);
}

function firstStrongEvidence(item, evidence, lang = 'en') {
  if (!evidence.length) {
    return lang === 'zh'
      ? (item.bodyFetched ? '正文给出了更具体的落地细节。' : '目前公开细节仍然偏少，更多还是标题级信号。')
      : (item.bodyFetched ? 'The full article adds more implementation detail.' : 'Public detail is still fairly thin, so this remains a headline-level signal.');
  }

  const line = lang === 'zh'
    ? replaceTermsZh(clipEvidence(evidence[0], 72))
    : clipEvidence(evidence[0], 120);

  if (lang === 'zh') {
    return item.bodyFetched ? `文中最值得记的一处细节是：${line}` : `目前能确认的公开信号是：${line}`;
  }
  return item.bodyFetched ? `The most useful detail in the piece is this: ${line}` : `The clearest public signal so far is this: ${line}`;
}

function titleCasePhrase(text = '') {
  return normalizePhraseCase(text)
    .split(/\s+/)
    .map(word => word.length <= 3 ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function composeWhatChangedEn(actor, action, topicEn, theme) {
  switch (action) {
    case 'open-source': return `${actor} opened up work around ${topicEn}, making it easier for the wider ecosystem to inspect, reuse, and build on.`;
    case 'integration': return `${actor} moved ${topicEn} deeper into product and developer workflows, which is really about ${theme.focusEn}.`;
    case 'research': return `${actor} published a research-led update around ${topicEn}, aimed at ${theme.focusEn}.`;
    case 'tutorial': return `${actor} published a hands-on account of ${topicEn}, with the emphasis on how it behaves in a real workflow rather than in abstract.`;
    case 'commercial': return `${actor} tied ${topicEn} to a more explicit product push, suggesting the story is moving closer to distribution and adoption.`;
    case 'release': return `${actor} rolled out a fresh move around ${topicEn}, continuing its push on ${theme.focusEn}.`;
    case 'benchmark': return `${actor} framed ${topicEn} as a notable performance jump rather than a routine iteration.`;
    default: return `${actor} put out a meaningful update around ${topicEn}.`;
  }
}

function composeWhatChangedZh(actor, action, topicZh, theme) {
  switch (action) {
    case 'open-source': return `${actor}把围绕${topicZh}的东西真正放了出来，重点不只是"开源"两个字，而是让外部生态更容易复用、验证和接着往下搭。`;
    case 'integration': return `${actor}把${topicZh}继续往产品和开发者工作流里压，重点已经不是演示能力，而是${theme.focusZh}。`;
    case 'research': return `${actor}放出了一项围绕${topicZh}的研究型更新，指向的是${theme.focusZh}。`;
    case 'tutorial': return `${actor}给出了一篇围绕${topicZh}的实践拆解，重点不在概念，而在它怎么进真实工作流。`;
    case 'commercial': return `${actor}把${topicZh}和更明确的产品化动作绑在一起，说明这件事正在往业务入口靠近。`;
    case 'release': return `${actor}围绕${topicZh}又往前推了一步，继续沿着"${theme.focusZh}"这条线加速。`;
    case 'benchmark': return `${actor}把${topicZh}放进更强的性能叙事里，这不是一次普通的小改版。`;
    default: return `${actor}带来了一条围绕${topicZh}的重要更新。`;
  }
}

function buildLocalizedTitleZh(item, actor, action, topicZh, theme) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  if (containsChinese(originalTitle)) return originalTitle;
  if (/heart health/i.test(originalTitle)) return 'Google 想把心血管早筛做成偏远地区也能用的 AI 基础服务';
  if (/deepresearch/i.test(originalTitle)) return 'NVIDIA AI-Q 登顶 DeepResearch Bench，Agent 工程开始卷长链路稳定性';
  if (/computer environment/i.test(originalTitle)) return 'OpenAI 把 agent runtime 讲明白了：模型之外，环境也开始产品化';
  if (/prompt injection/i.test(originalTitle)) return '挡提示注入，OpenAI 先补的是 agent 这层的防线';
  if (/rakuten/i.test(originalTitle)) return 'Rakuten 用 Codex 把修复速度拉快，Agent 工具开始交付业务指标';
  if (/wayfair/i.test(originalTitle)) return 'Wayfair 案例说明：AI 的价值正在从客服问答转到业务流程改写';
  if (/sheets/i.test(originalTitle)) return 'Gemini 进了表格，AI 开始接手更具体的办公室动作';
  if (/embedding/i.test(originalTitle)) return '多模态 embedding 继续往前卷，检索层开始重新洗牌';
  return `${actor}｜${theme.themeZh}`;
}

function buildCardHeadlineEn(item, actor, action, topicEn, theme) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  if (originalTitle) return normalizePhraseCase(originalTitle);
  if (action === 'tutorial') return `${actor} gets specific about ${topicEn} in production`;
  if (action === 'benchmark') return `${actor} turns ${topicEn} into a performance story`;
  return `${actor} pushes on ${theme.themeEn.toLowerCase()}`;
}

function buildBriefTitleZh(item, actor, theme) {
  const title = cleanText(item.titleZh || '');
  if (title) return title;
  const fallback = cleanText(item.title || item.pageTitle || '');
  if (containsChinese(fallback)) return fallback;
  return `${actor}｜${theme.themeZh}`;
}

function buildBriefTitleEn(item, actor, theme) {
  const title = cleanText(item.titleEn || item.title || item.pageTitle || '');
  if (title) return normalizePhraseCase(title);
  return `${actor} | ${theme.themeEn}`;
}

function chooseZhAngle(theme, action, actor) {
  if (theme.key === 'agents-tools') return `${actor}想证明的不是模型更聪明，而是 agent 终于更像能进生产环境的工具。`;
  if (theme.key === 'safety') return `这条更新真正关心的不是概念安全，而是模型在复杂链路里还能不能守住边界。`;
  if (theme.key === 'retrieval-multimodal') return `看上去像底层升级，但最后影响的还是搜索、知识库和多模态产品的手感。`;
  if (theme.key === 'products') return `重点不是功能又多了一项，而是 AI 是否更深地嵌进用户日常动作。`;
  if (theme.key === 'data-eval') return `它表面讲的是数据或评测，实际上讲的是以后大家用什么口径比较能力。`;
  if (action === 'tutorial') return `值得看的是，它给出的不只是观点，而是更接近工作流现场的做法。`;
  return `这条消息值得看，不只是因为它新，而是因为它把最近这波行业主线又往前推了一截。`;
}

function chooseEnAngle(theme, action, actor) {
  if (theme.key === 'agents-tools') return `${actor} is making the case that the next battle is not smarter chat, but software that can actually stay inside the workflow.`;
  if (theme.key === 'safety') return `The point here is not safety theater; it is whether models can keep their footing when instructions start to conflict.`;
  if (theme.key === 'retrieval-multimodal') return `This looks like infrastructure, but it usually decides how good search, memory, and multimodal products feel in practice.`;
  if (theme.key === 'products') return `The real question is not whether one more feature shipped, but whether AI is getting folded into repeat behavior.`;
  if (theme.key === 'data-eval') return `On the surface this is about data or benchmarks; underneath, it is about who gets to define the comparison standard.`;
  if (action === 'tutorial') return `What makes this worth reading is that it is closer to workflow reality than to abstract positioning.`;
  return `What makes this worth following is that it pushes the broader industry arc a little further forward.`;
}

function buildNarrativeZh(item, actor, theme, action, whatChangedZh, whyZh, watchZh, evidence) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  const evidenceLine = firstStrongEvidence(item, evidence, 'zh');

  if (theme.key === 'agents-tools') {
    return [
      `${whatChangedZh}${/rakuten/i.test(originalTitle) ? ' 这类案例最有意思的地方，是它已经不再停留在"开发者喜欢不喜欢"，而是开始拿 MTTR、评审效率、CI/CD 这类业务指标说话。' : ` ${chooseZhAngle(theme, 'integration', actor)}`}`,
      `${evidenceLine} 换句话说，行业现在卷的已经不是谁更会回答，而是谁更能把能力接进现有软件和流程。`,
      `接下来真正要看的，是这类能力会不会变成默认配置，而不是只存在于少数标杆案例里。${watchZh}`,
    ];
  }

  if (theme.key === 'safety') {
    return [
      `${whatChangedZh}${chooseZhAngle(theme, 'research', actor)}`,
      `${evidenceLine} 这件事一旦做不好，Agent 在企业和高风险场景里的可用性就会被直接卡住。`,
      `${whyZh}${watchZh}`,
    ];
  }

  if (theme.key === 'retrieval-multimodal' || theme.key === 'data-eval') {
    return [
      `${whatChangedZh}${chooseZhAngle(theme, action, actor)}`,
      `${evidenceLine} 这类更新往往不太像 headline product launch，但它经常决定后面一整批产品体验的上限。`,
      `${whyZh}${watchZh}`,
    ];
  }

  if (theme.key === 'products') {
    return [
      `${whatChangedZh}${chooseZhAngle(theme, action, actor)}`,
      `${evidenceLine} 一旦用户开始在日常动作里反复用到它，竞争维度就会从"能力有没有"转向"入口深不深、习惯强不强"。`,
      `所以后面该盯的，不只是发布节奏，而是使用频率、留存和付费这些更硬的产品信号。${watchZh}`,
    ];
  }

  return [
    `${whatChangedZh}${chooseZhAngle(theme, action, actor)}`,
    `${evidenceLine} ${whyZh}`,
    `如果把它放回这几周的节奏里看，更值得追的是它会不会从展示走向默认能力。${watchZh}`,
  ];
}

function buildNarrativeEn(item, actor, theme, action, whatChangedEn, whyEn, watchEn, evidence) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  const evidenceLine = firstStrongEvidence(item, evidence, 'en');

  if (theme.key === 'agents-tools') {
    return [
      trimText(`${whatChangedEn} ${/rakuten/i.test(originalTitle) ? 'That matters because the story is already shifting from developer enthusiasm to operating metrics like MTTR, review speed, and CI/CD throughput.' : chooseEnAngle(theme, 'integration', actor)}`, 220),
      trimText(`${evidenceLine} In other words, the race is no longer just about who answers well; it is about who plugs into software and keeps the surrounding workflow intact.`, 220),
      trimText(`What matters next is whether this becomes default product plumbing rather than a showcase reserved for a few strong case studies. ${watchEn}`, 220),
    ];
  }

  if (theme.key === 'safety') {
    return [
      trimText(`${whatChangedEn} ${chooseEnAngle(theme, 'research', actor)}`, 220),
      trimText(`${evidenceLine} If this layer does not hold, controllable agents in enterprise and higher-risk settings stay much harder to trust.`, 220),
      trimText(`${whyEn} ${watchEn}`, 220),
    ];
  }

  if (theme.key === 'retrieval-multimodal' || theme.key === 'data-eval') {
    return [
      trimText(`${whatChangedEn} ${chooseEnAngle(theme, action, actor)}`, 220),
      trimText(`${evidenceLine} These are not always the loudest headlines, but they often decide the ceiling for a whole wave of downstream products.`, 220),
      trimText(`${whyEn} ${watchEn}`, 220),
    ];
  }

  if (theme.key === 'products') {
    return [
      trimText(`${whatChangedEn} ${chooseEnAngle(theme, action, actor)}`, 220),
      trimText(`${evidenceLine} Once people start using a feature inside everyday tasks, the contest shifts from raw capability to habit, entry point, and product depth.`, 220),
      trimText(`So the next signals to watch are not more launch copy, but usage frequency, retention, and eventually monetization. ${watchEn}`, 220),
    ];
  }

  return [
    trimText(`${whatChangedEn} ${chooseEnAngle(theme, action, actor)}`, 220),
    trimText(`${evidenceLine} ${whyEn}`, 220),
    trimText(`Given the current pace, the most concrete thing to track is: ${watchEn}`, 220),
  ];
}

function buildSectionLabelZh(theme, index) {
  const labels = ['主线一', '主线二', '主线三', '主线四', '补充一', '补充二', '补充三', '补充四'];
  return `${labels[index] || `补充 ${index + 1}`}｜${theme.themeZh}`;
}

function buildSectionLabelEn(theme, index) {
  const labels = ['Thread 1', 'Thread 2', 'Thread 3', 'Thread 4', 'Brief 1', 'Brief 2', 'Brief 3', 'Brief 4'];
  return `${labels[index] || `Brief ${index + 1}`} | ${theme.themeEn}`;
}

function buildThemes(items = []) {
  const counts = new Map();
  for (const item of items) {
    const key = `${item.themeZh}__${item.themeEn}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [themeZh, themeEn] = key.split('__');
    return { themeZh, themeEn, count };
  }).sort((a, b) => b.count - a.count);
}

function buildBodyCoverage(items = []) {
  const targeted = items.filter(item => item.bodyFetchTargeted).length;
  const succeeded = items.filter(item => item.bodyFetched).length;
  const totalWords = items.reduce((sum, item) => sum + (item.bodyWordCount || 0), 0);
  return { targeted, succeeded, totalWords, ratio: targeted ? Number((succeeded / targeted).toFixed(2)) : 0 };
}

/**
 * Build Chinese intro from the first item's LLM-generated narrative.
 * Falls back to buildHeroSummaryZh only if no LLM narrative available.
 * This avoids the template "两条线同时加速..." phrasing.
 */
function buildIntroFromFirstItem(items, windowHours, limitedUpdateWindow) {
  // Find first item with actual LLM-generated narrative (not null, not template)
  for (const item of items) {
    const narrative = item.narrativeZh;
    if (Array.isArray(narrative) && narrative.length > 0 && narrative[0]) {
      const firstPara = narrative[0].trim();
      // Skip if it looks like a template phrase
      if (!firstPara.includes('两条线同时加速') && !firstPara.includes('两条发展路径') && firstPara.length > 30) {
        return firstPara;
      }
    }
    // Also try narrativeEn if no Chinese
    const narrativeEn = item.narrativeEn;
    if (Array.isArray(narrativeEn) && narrativeEn.length > 0 && narrativeEn[0]) {
      const firstPara = narrativeEn[0].trim();
      if (!firstPara.includes('two lines') && firstPara.length > 30) {
        return firstPara; // use English if no Chinese available
      }
    }
  }
  // Fall back to template only as last resort
  return buildHeroSummaryZh(items, [], windowHours);
}

function buildHeroSummaryZh(items, themes, windowHours) {
  if (!items.length) return `过去 ${windowHours} 小时没有出现值得单独展开的高信号更新。`;
  const actors = uniqueStrings(items.slice(0, 4).map(item => inferActor(item)));
  const topTheme = themes[0]?.themeZh || '能力边界';
  const secondTheme = themes[1]?.themeZh || '产品与工作流';
  if (themes[0]?.themeZh && themes[1]?.themeZh) {
    return `今天这期更像两条线同时加速：一条是 ${topTheme}，另一条是 ${secondTheme}。${actors.length ? `${actors.join('、')} 分别从研究、产品和工具三侧往前拱，读完会更容易看清当下 AI 行业的重心并不在"新功能数量"，而在"能力能不能真正接进现实流程"。` : '几条更新都在把同一个问题往前推：能力怎样真正接进现实流程。'}`;
  }
  return `过去 ${windowHours} 小时里，AI 领域最值得看的不是单条新闻，而是一条更清晰的方向：${topTheme} 正在更快地往真实产品和工作流里落。`;
}

function buildHeroSummaryEn(items, themes, windowHours) {
  if (!items.length) return `There were no high-signal AI updates in the last ${windowHours} hours worth expanding today.`;
  const actors = uniqueStrings(items.slice(0, 4).map(item => inferActor(item)));
  const topTheme = themes[0]?.themeEn || 'capability shifts';
  const secondTheme = themes[1]?.themeEn || 'products and workflows';
  if (themes[0]?.themeEn && themes[1]?.themeEn) {
    return `This issue is really about two lines accelerating at once: ${topTheme}, and ${secondTheme}. ${actors.length ? `${actors.join(', ')} are pushing from different angles, but the shared point is hard to miss: the market is caring less about isolated model demos and more about whether capability can survive contact with real workflows.` : 'Across the items, the shared question is whether capability survives contact with real workflows.'}`;
  }
  return `The clearest signal from the last ${windowHours} hours is not one announcement, but a direction: AI capability is moving closer to real product and workflow use.`;
}

function buildTitleSummaryZh(items, themes) {
  const titles = items.map(item => item.titleZh || '');
  if (titles.some(title => /提示注入|指令层级/.test(title)) && titles.some(title => /Codex|agent|工作流/i.test(title))) return '安全边界与 agent 落地，正在一起往前推';
  if (titles.some(title => /表格|ChatGPT|心血管|Wayfair/.test(title))) return 'AI 正在离"会回答"更远，离"真能干活"更近';
  const actors = uniqueStrings(items.slice(0, 3).map(item => inferActor(item)));
  if (themes[0]?.themeZh && actors.length >= 2) return `${actors.slice(0, 2).join('、')}都在把 AI 往真实工作流里送`;
  if (themes[0]?.themeZh) return `${themes[0].themeZh}这一侧又有新动静`;
  return '近 24 小时重点更新';
}

function buildTitleSummaryEn(themes, items) {
  const titles = items.map(item => cleanText(item.titleEn || item.title || ''));
  if (titles.some(title => /prompt injection|instruction hierarchy/i.test(title)) && titles.some(title => /codex|agent|workflow/i.test(title))) {
    return 'Safety and agent execution are starting to converge';
  }
  if (titles.some(title => /sheets|chatgpt|heart health|wayfair/i.test(title))) {
    return 'AI is moving away from novelty and closer to actual work';
  }
  if (themes[0]?.themeEn) return 'Where AI starts to look more like infrastructure than demo';
  return 'High-signal updates';
}

function buildItem(item, index) {
  const theme = inferTheme(item);
  const actor = inferActor(item);
  const analysisText = cleanText([item.title, item.pageTitle, item.contentSnippet, item.bodyText, item.reason].filter(Boolean).join(' '));
  const action = inferAction(analysisText);
  const topics = pickTopicLabels(analysisText, theme);
  const evidence = pickEvidenceSentences(item);
  const whatChangedEn = composeWhatChangedEn(actor, action, topics.topicEn, theme);
  const whatChangedZh = composeWhatChangedZh(actor, action, topics.topicZh, theme);
  const whyItMattersEn = theme.whyEn;
  const whyItMattersZh = theme.whyZh;
  const watchNextEn = theme.watchEn;
  const watchNextZh = theme.watchZh;
  const narrativeZh = buildNarrativeZh(item, actor, theme, action, whatChangedZh, whyItMattersZh, watchNextZh, evidence);
  const narrativeEn = buildNarrativeEn(item, actor, theme, action, whatChangedEn, whyItMattersEn, watchNextEn, evidence);
  const summaryZh = trimText(narrativeZh.join(' '), 9999);
  const summaryEn = trimText(narrativeEn.join(' '), 9999);
  const labels = relativeTimeLabels(item.pubDate || item.publishedAt);

  const titleZh = buildLocalizedTitleZh(item, actor, action, topics.topicZh, theme);
  const titleEn = buildCardHeadlineEn(item, actor, action, topics.topicEn, theme);

  return {
    id: item.id,
    rank: index + 1,
    sectionLabelZh: buildSectionLabelZh(theme, index),
    sectionLabelEn: buildSectionLabelEn(theme, index),
    titleZh,
    titleEn,
    briefTitleZh: buildBriefTitleZh({ ...item, titleZh }, actor, theme) || titleZh,
    briefTitleEn: buildBriefTitleEn({ ...item, titleEn }, actor, theme) || titleEn,
    kickerZh: `${actor} · ${theme.themeZh}`,
    kickerEn: `${actor} · ${theme.themeEn}`,
    summaryZh,
    summaryEn,
    deckZh: trimText(whatChangedZh, 92),
    deckEn: trimText(whatChangedEn, 156),
    narrativeZh,
    narrativeEn,
    whatChangedZh,
    whatChangedEn,
    whyItMattersZh,
    whyItMattersEn,
    watchNextZh,
    watchNextEn,
    tag: theme.tag || item.categoryHint || 'AI',
    source: item.sourceDomain,
    sourceName: item.sourceName,
    sourceUrl: item.link,
    relatedLinks: [
      { labelZh: `${item.sourceName || item.sourceDomain} 原文`, labelEn: `${item.sourceName || item.sourceDomain} source`, url: item.link },
      item.sourceUrl ? { labelZh: 'RSS 源', labelEn: 'RSS feed', url: item.sourceUrl } : null,
    ].filter(Boolean),
    takeawayBulletsZh: [],
    takeawayBulletsEn: [],
    evidenceBulletsZh: evidence.length ? evidence.map(line => replaceTermsZh(trimText(line, 120))) : [],
    evidenceBulletsEn: evidence.length ? evidence.map(line => trimText(line, 160)) : [],
    themeZh: theme.themeZh,
    themeEn: theme.themeEn,
    impactZh: watchNextZh,
    impactEn: watchNextEn,
    publishedAt: item.pubDate || item.publishedAt,
    publishedLabelZh: labels.zh,
    publishedLabelEn: labels.en,
    score: item.score,
    featured: index < 3,
    bodyFetched: Boolean(item.bodyFetched),
    bodyFetchTargeted: Boolean(item.bodyFetchTargeted),
    bodyFetchStatus: item.bodyFetchStatus || 'unknown',
    bodyWordCount: item.bodyWordCount || wordCount(item.bodyText || ''),
    bodySummary: item.bodySummary || '',
    sourceNoteZh: item.bodyFetched ? '正文已补充抓取' : '目前主要依据公开摘要',
    sourceNoteEn: item.bodyFetched ? 'full article fetched' : 'summary-level public detail only',
    llmGenerated: false,
  };
}

function buildItemWithLLM(item, index, llmAnalysis) {
  const theme = inferTheme(item);
  const actor = inferActor(item);
  const analysisText = cleanText([item.title, item.pageTitle, item.contentSnippet, item.bodyText, item.reason].filter(Boolean).join(' '));
  const action = inferAction(analysisText);
  const topics = pickTopicLabels(analysisText, theme);
  const evidence = pickEvidenceSentences(item);
  const labels = relativeTimeLabels(item.pubDate || item.publishedAt);

  // Find this article's LLM analysis by index (1-based in LLM output)
  const articleLLM = llmAnalysis.articles?.find(a => a.index === index + 1);

  // Use LLM-generated title if available, otherwise build from templates
  const titleZh = articleLLM?.titleZh || buildLocalizedTitleZh(item, actor, action, topics.topicZh, theme);
  const titleEn = articleLLM?.titleEn || buildCardHeadlineEn(item, actor, action, topics.topicEn, theme);

  // narrativeEn/Zh arrays: [whatChanged, whyItMatters, watchNext]
  const narrativeEn = articleLLM?.narrativeEn?.filter(Boolean) || [];
  const narrativeZh = articleLLM?.narrativeZh?.filter(Boolean) || [];

  const whatChangedEn = narrativeEn[0] || '';
  const whyItMattersEn = narrativeEn[1] || '';
  const watchNextEn = narrativeEn[2] || '';
  const whatChangedZh = narrativeZh[0] || '';
  const whyItMattersZh = narrativeZh[1] || '';
  const watchNextZh = narrativeZh[2] || '';

  return {
    id: item.id,
    rank: index + 1,
    sectionLabelZh: buildSectionLabelZh(theme, index),
    sectionLabelEn: buildSectionLabelEn(theme, index),
    titleZh,
    titleEn,
    briefTitleZh: titleZh,
    briefTitleEn: titleEn,
    kickerZh: `${actor} · ${theme.themeZh}`,
    kickerEn: `${actor} · ${theme.themeEn}`,
    summaryZh: trimText(narrativeZh.join(' '), 9999),
    summaryEn: trimText(narrativeEn.join(' '), 9999),
    deckZh: trimText(whatChangedZh, 92),
    deckEn: trimText(whatChangedEn, 156),
    narrativeZh,
    narrativeEn,
    whatChangedZh,
    whatChangedEn,
    whyItMattersZh,
    whyItMattersEn,
    watchNextZh,
    watchNextEn,
    tag: theme.tag || item.categoryHint || 'AI',
    source: item.sourceDomain,
    sourceName: item.sourceName,
    sourceUrl: item.link,
    relatedLinks: [
      { labelZh: `${item.sourceName || item.sourceDomain} 原文`, labelEn: `${item.sourceName || item.sourceDomain} source`, url: item.link },
      item.sourceUrl ? { labelZh: 'RSS 源', labelEn: 'RSS feed', url: item.sourceUrl } : null,
    ].filter(Boolean),
    takeawayBulletsZh: [],
    takeawayBulletsEn: [],
    evidenceBulletsZh: evidence.length ? evidence.map(line => replaceTermsZh(trimText(line, 120))) : [],
    evidenceBulletsEn: evidence.length ? evidence.map(line => trimText(line, 160)) : [],
    themeZh: theme.themeZh,
    themeEn: theme.themeEn,
    impactZh: watchNextZh,
    impactEn: watchNextEn,
    publishedAt: item.pubDate || item.publishedAt,
    publishedLabelZh: labels.zh,
    publishedLabelEn: labels.en,
    score: item.score,
    featured: index < 3,
    bodyFetched: Boolean(item.bodyFetched),
    bodyFetchTargeted: Boolean(item.bodyFetchTargeted),
    bodyFetchStatus: item.bodyFetchStatus || 'unknown',
    bodyWordCount: item.bodyWordCount || wordCount(item.bodyText || ''),
    bodySummary: item.bodySummary || '',
    sourceNoteZh: item.bodyFetched ? '正文已补充抓取，LLM 分析' : 'LLM 分析（基于摘要）',
    sourceNoteEn: item.bodyFetched ? 'full article fetched, LLM analyzed' : 'LLM analyzed from summary',
    llmGenerated: true,
  };
}

export async function buildDigestItemsAsync(candidates = []) {
  const llmAnalysis = await generateNarrativeWithLLM(candidates);

  if (llmAnalysis) {
    // llmAnalysis.articles already contains the per-article results
    // Map each candidate to its corresponding LLM result
    const items = llmAnalysis.articles.map((llmResult, index) => {
      const originalItem = candidates[index];
      if (!originalItem) return null;

      // If LLM failed for this item, use template fallback
      if (llmResult.llmFailed || !llmResult.narrativeEn) {
        return buildItem(originalItem, index);
      }

      // Build item with LLM-generated content
      return buildItemWithLLM(originalItem, index, {
        articles: [{
          index: llmResult.index,
          narrativeEn: llmResult.narrativeEn,
          narrativeZh: llmResult.narrativeZh || [],
          titleEn: llmResult.titleEn || '',
          titleZh: '',
        }],
        seoTitle: llmAnalysis.seoTitle,
        heroSummary: llmAnalysis.heroSummary,
        seoDescription: llmAnalysis.seoDescription,
        keywords: llmAnalysis.keywords,
      });
    }).filter(Boolean);

    // Attach LLM metadata to items for later use in buildDigestDetail
    items._llmSeoTitle = llmAnalysis.seoTitle;
    items._llmSeoDescription = llmAnalysis.seoDescription;
    items._llmKeywords = llmAnalysis.keywords;
    items._llmHeroSummary = llmAnalysis.heroSummary;
    return items;
  }

  return candidates.map((item, index) => buildItem(item, index));
}

export function buildDigestItems(candidates = []) {
  const items = candidates.map((item, index) => buildItem(item, index));
  return diversifyNarratives(items);
}

/**
 * Diversify narratives to reduce template repetition.
 * If two items' narrativeEn[0] share >60% word overlap, append specific evidence.
 */
function diversifyNarratives(items) {
  const STOPWORDS = new Set(['the','a','an','is','are','was','were','be','been','being','have','has','had',
    'do','does','did','will','would','could','should','may','might','must','can','to','of','in','for',
    'on','with','at','by','from','as','into','through','during','before','after','above','below',
    'between','under','again','further','then','once','here','there','when','where','why','how',
    'all','each','few','more','most','other','some','such','no','nor','not','only','own','same',
    'so','than','too','very','just','and','but','if','or','because','until','while','that','this',
    'these','those','what','which','who','whom','whose']);

  function wordSet(text) {
    return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w)));
  }

  function overlap(a, b) {
    const ws = wordSet(a), wt = wordSet(b);
    if (ws.size === 0 || wt.size === 0) return 0;
    const inter = [...ws].filter(w => wt.has(w)).length;
    const union = new Set([...ws, ...wt]).size;
    return union > 0 ? inter / union : 0;
  }

  for (let i = 1; i < items.length; i++) {
    for (let j = 0; j < i; j++) {
      if (!items[i].narrativeEn?.[0] || !items[j].narrativeEn?.[0]) continue;
      if (overlap(items[i].narrativeEn[0], items[j].narrativeEn[0]) > 0.6) {
        // Append article title or evidence to break similarity
        const evidence = items[i].evidenceBulletsEn?.[0] || items[i].titleEn || '';
        if (evidence) {
          const suffix = ` In "${evidence.slice(0, 80)}"`;
          items[i].narrativeEn[0] = trimText(items[i].narrativeEn[0].replace(/\.\s*$/, '') + suffix + '.', 220);
        }
        // Same for Chinese
        if (items[i].narrativeZh?.[0] && items[j].narrativeZh?.[0]) {
          const evidenceZh = items[i].evidenceBulletsZh?.[0] || items[i].titleZh || '';
          if (evidenceZh) {
            const suffixZh = `在"${evidenceZh.slice(0, 60)}"中可以看到`;
            items[i].narrativeZh[0] = trimText(items[i].narrativeZh[0].replace(/[。；]?\s*$/, '') + suffixZh + '。', 220);
          }
        }
        break; // Only fix once per item
      }
    }
  }

  return items;
}

/**
 * Reassign section labels so no more than 2 items share the same theme header.
 */
function reassignSectionLabels(items) {
  const themeCount = new Map();
  const themeIndex = new Map();

  // Group by theme
  const groups = new Map();
  for (const item of items) {
    const key = `${item.themeZh}__${item.themeEn}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // Reassign: if a theme has >2 items, move extras to "补充" variant
  let supplementIdx = 0;
  for (const [key, group] of groups) {
    if (group.length > 2) {
      for (let i = 2; i < group.length; i++) {
        const baseIdx = group.length > 4 ? i : 3 + supplementIdx;
        supplementIdx++;
        group[i].sectionLabelZh = `补充${supplementIdx}｜${group[i].themeZh}`;
        group[i].sectionLabelEn = `Brief ${supplementIdx} | ${group[i].themeEn}`;
      }
    }
  }

  // Re-number sequentially
  let threadIdx = 0;
  let briefIdx = 0;
  for (const item of items) {
    if (item.sectionLabelZh.startsWith('主线') || item.sectionLabelZh.startsWith('补充')) {
      if (item.sectionLabelZh.startsWith('主线')) {
        const zh = `主线${threadIdx + 1}｜${item.themeZh}`;
        const en = `Thread ${threadIdx + 1} | ${item.themeEn}`;
        item.sectionLabelZh = zh;
        item.sectionLabelEn = en;
        threadIdx++;
      } else {
        briefIdx++;
        item.sectionLabelZh = item.sectionLabelZh.replace(/^补充\d+/, `补充${briefIdx}`);
        item.sectionLabelEn = item.sectionLabelEn.replace(/^Brief \d+/, `Brief ${briefIdx}`);
      }
    }
  }

  return items;
}

export function buildDigestDetail({ date, items, windowHours, digestUrl, generatedAt, limitedUpdateWindow, llmAnalysis }) {
  // Reassign section labels to avoid >2 items sharing same header
  reassignSectionLabels(items);

  const themes = buildThemes(items);
  const bodyCoverage = buildBodyCoverage(items);

  let titleSummaryZh, titleSummaryEn, introZh, introEn;

  if (llmAnalysis?.seoTitle?.en) {
    titleSummaryEn = llmAnalysis.seoTitle.en;
    titleSummaryZh = llmAnalysis.seoTitle.zh || titleSummaryEn;
    introEn = (llmAnalysis.heroSummary.en
      ? llmAnalysis.heroSummary.en
      : buildHeroSummaryEn(items, themes, windowHours))
      + (limitedUpdateWindow ? ` High-signal items were thin in the last ${windowHours} hours, so older material was deliberately left out rather than padded in.` : '');
    introZh = (llmAnalysis.heroSummary.zh
      ? llmAnalysis.heroSummary.zh
      : buildIntroFromFirstItem(items, windowHours, limitedUpdateWindow))
      + (limitedUpdateWindow ? ` 另外，近 ${windowHours} 小时可保留的高信号更新不多，所以这期没有拿更早的消息来凑数。` : '');
  } else {
    titleSummaryZh = buildTitleSummaryZh(items, themes);
    titleSummaryEn = buildTitleSummaryEn(themes, items);
    introZh = buildHeroSummaryZh(items, themes, windowHours) + (limitedUpdateWindow ? ` 另外，近 ${windowHours} 小时可保留的高信号更新不多，所以这期没有拿更早的消息来凑数。` : '');
    introEn = buildHeroSummaryEn(items, themes, windowHours) + (limitedUpdateWindow ? ` High-signal items were thin in the last ${windowHours} hours, so older material was deliberately left out rather than padded in.` : '');
  }

  const excerptZh = items.length ? trimText(`${introZh} 下面这几条按重要性和可读性往下排，先抓方向，再看细节。`, 120) : `近 ${windowHours} 小时重点更新有限，今天不混入更早内容。`;
  const excerptEn = items.length ? trimText(`${introEn} The entries below are ordered to help you catch the line of travel first, then the concrete details.`, 180) : `Updates in the last ${windowHours} hours were limited, so older items were intentionally excluded.`;

  return {
    slug: `ai-daily-${date}`,
    date,
    titleZh: `AI 日报｜${titleSummaryZh}`,
    titleEn: `AI Daily | ${titleSummaryEn}`,
    excerptZh,
    excerptEn,
    issueSummaryZh: introZh,
    issueSummaryEn: introEn,
    introZh,
    introEn,
    methodologyZh: '',
    methodologyEn: '',
    path: `/blog/ai-daily-${date}`,
    digestUrl,
    itemCount: items.length,
    heroTitleZh: items[0]?.briefTitleZh || '',
    heroTitleEn: items[0]?.briefTitleEn || '',
    limitedUpdateWindow,
    generatedAt,
    windowHours,
    themes,
    bodyCoverage,
    featuredItems: items.slice(0, 3).map(item => ({
      id: item.id,
      titleZh: item.briefTitleZh || item.titleZh,
      titleEn: item.briefTitleEn || item.titleEn,
      tag: item.tag,
      summaryZh: item.summaryZh,
      summaryEn: item.summaryEn,
      whyItMattersZh: item.whyItMattersZh,
      whyItMattersEn: item.whyItMattersEn,
      publishedLabelZh: item.publishedLabelZh,
      publishedLabelEn: item.publishedLabelEn,
    })),
    items,
    llmGenerated: Boolean(llmAnalysis),
  };
}

export async function buildDigestDetailAsync({ date, items, windowHours, digestUrl, generatedAt, limitedUpdateWindow }) {
  // LLM already ran in buildDigestItemsAsync, so just build the detail
  const llmGenerated = items.some(item => item.llmGenerated);
  const llmAnalysis = llmGenerated ? { seoTitle: null, seoDescription: null, keywords: null, heroSummary: null } : null;
  return buildDigestDetail({ date, items, windowHours, digestUrl, generatedAt, limitedUpdateWindow, llmAnalysis });
}

export function buildDigestMarkdown(detail) {
  const enBody = detail.items.length
    ? detail.items.map(item => `## ${item.sectionLabelEn}\n\n### ${item.briefTitleEn || item.titleEn}\n\n${(item.narrativeEn || []).map(p => `${p}`).join('\n\n')}\n\nLinks: ${(item.relatedLinks || []).map(link => `[${link.labelEn}](${link.url})`).join(' · ')}`).join('\n\n---\n\n')
    : 'No briefing today.';

  const zhBody = detail.items.length
    ? detail.items.map(item => `## ${item.sectionLabelZh}\n\n### ${item.briefTitleZh || item.titleZh}\n\n${(item.narrativeZh || []).map(p => `${p}`).join('\n\n')}\n\n相关链接：${(item.relatedLinks || []).map(link => `[${link.labelZh}](${link.url})`).join(' · ')}`).join('\n\n---\n\n')
    : '近 24 小时重点更新有限，今天不混入更早内容。';

  return `---\nkind: "digest"\ntitleZh: "${escapeFrontmatter(detail.titleZh)}"\ntitleEn: "${escapeFrontmatter(detail.titleEn)}"\nexcerptZh: "${escapeFrontmatter(detail.excerptZh)}"\nexcerptEn: "${escapeFrontmatter(detail.excerptEn)}"\ntag: "AI 日报"\ntagEn: "AI Daily"\nreadTime: ${Math.max(8, Math.round(detail.items.length * 3.5))}\ndate: ${detail.date}\n---\n\n<!-- CONTENT_EN -->\n${detail.introEn}\n\n${enBody}\n\n<!-- CONTENT_ZH -->\n${detail.introZh}\n\n${zhBody}\n`;
}

export function buildDigestReport(detail) {
  const topLinesZh = detail.items.slice(0, 4).map((item, index) => `${index + 1}. ${item.briefTitleZh || item.titleZh} -- ${trimText(item.summaryZh, 60)}`);
  const topLinesEn = detail.items.slice(0, 3).map((item, index) => `${index + 1}. ${item.briefTitleEn || item.titleEn} - ${trimText(item.summaryEn, 90)}`);

  const messageZh = [
    `✅ AI 日报更新成功（${detail.date}）`,
    `网站地址：<${detail.digestUrl}>`,
    `今日导语：${trimText(detail.introZh, 88)}`,
    '今天展开：',
    ...topLinesZh,
  ].filter(Boolean).join('\n');

  const messageEn = [
    `✅ AI digest updated successfully (${detail.date})`,
    `Digest URL: <${detail.digestUrl}>`,
    `Lead: ${trimText(detail.introEn, 120)}`,
    'Inside today:',
    ...topLinesEn,
  ].filter(Boolean).join('\n');

  return {
    text: `${messageZh}\n\n${messageEn}`,
    json: {
      status: 'success',
      date: detail.date,
      digestUrl: detail.digestUrl,
      itemCount: detail.itemCount,
      limitedUpdateWindow: detail.limitedUpdateWindow,
      bodyCoverage: detail.bodyCoverage,
      messageZh,
      messageEn,
      generatedAt: detail.generatedAt,
      themes: detail.themes,
    },
  };
}
