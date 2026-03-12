import {
  cleanText,
  escapeFrontmatter,
  relativeTimeLabels,
  sentenceSplit,
  trimText,
  uniqueStrings,
  wordCount,
} from './shared.mjs';

const THEME_RULES = [
  {
    key: 'safety',
    tag: 'Security',
    themeZh: '模型安全与可控性',
    themeEn: 'Model safety and controllability',
    keywords: ['instruction hierarchy', 'prompt injection', 'safety', 'guardrail', 'jailbreak', 'policy', 'alignment', 'steerability'],
    whyZh: '这类进展会直接影响模型在真实产品里能否稳定遵循高优先级指令，是企业接入、Agent 可控性和高风险场景落地的基础。',
    whyEn: 'This kind of progress changes whether frontier models can obey higher-priority instructions reliably in production, which directly affects enterprise adoption, controllable agents, and high-risk deployments.',
    watchZh: '下一步要看它会不会进入 API、系统提示策略和公开评测基线，而不只是停留在研究展示。',
    watchEn: 'Watch whether it moves into APIs, system-prompt policy controls, and public eval baselines instead of remaining a research-only result.',
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
    whyZh: '行业竞争点正在从“聊天回答得好不好”转向“能不能稳定接进软件、工具链和自动化流程”，这决定了真正的生产力入口。',
    whyEn: 'The competitive focus is shifting from chat quality to whether models can plug into software, tooling, and automation flows reliably; that is where durable productivity entry points emerge.',
    watchZh: '后续要看它是否被嵌进真实产品和开发者工作流，以及生态是否围绕它形成新的分发与集成方式。',
    watchEn: 'Watch whether it gets embedded into real products and developer workflows, and whether the ecosystem reorganizes around new distribution and integration patterns.',
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
    whyEn: 'These lower-layer capabilities determine the quality ceiling for search, recommendations, knowledge systems, and multimodal retrieval—many AI products become meaningfully better or worse here.',
    watchZh: '接下来要看效果、成本和工具链支持是否拉开差距，以及企业知识库、RAG 和跨模态搜索是否快速跟进。',
    watchEn: 'Watch whether quality, cost, and tooling support create a real gap—and whether enterprise knowledge bases, RAG stacks, and cross-modal search move quickly in response.',
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
    whyEn: 'Once capability lands inside everyday user actions, competition shifts from raw model scores to depth of use, retention, interaction design, and default entry points.',
    watchZh: '后续重点是看用户行为是否改变：是否更频繁打开、是否形成新的工作习惯、是否带来付费或留存提升。',
    watchEn: 'The next thing to watch is user behavior change: more frequent opens, new default habits, and measurable gains in retention or monetization.',
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
    whyEn: 'Open-source moves change who can access capability, at what cost, and which models or tools the surrounding ecosystem standardizes around.',
    watchZh: '重点看许可证、部署门槛、社区跟进速度，以及是否出现围绕它的新工具链和最佳实践。',
    watchEn: 'Watch the license, deployment requirements, community uptake, and whether new tooling or best practices form around it.',
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
    whyEn: 'Infrastructure changes often decide cost, throughput, collaboration, and delivery speed. They are rarely the flashiest updates, but they often decide whether teams can scale real deployments.',
    watchZh: '接下来要看这类能力会不会真正进入默认工作流，以及是否显著改变推理成本、部署复杂度或数据协同方式。',
    watchEn: 'Watch whether these capabilities land in default workflows and materially change inference cost, deployment complexity, or data collaboration patterns.',
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
    whyEn: 'Data supply and evaluation standards shape the ceiling of model performance, and they redefine how teams compare capability, optimize training, and choose directions.',
    watchZh: '值得继续跟进的是：它会不会被社区广泛复用，是否成为新的默认比较口径。',
    watchEn: 'The key question is whether the community actually reuses it and whether it becomes part of the default comparison stack.',
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
    whyEn: 'Research-heavy updates do not always become products immediately, but they often reveal where the next capability boundary is moving.',
    watchZh: '要看后续是否出现复现、开源实现、API 化，或者被头部产品吸收进默认能力。',
    watchEn: 'Watch for replications, open implementations, API exposure, or absorption into mainstream products.',
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
  ['copilot', 'Copilot'],
  ['chatgpt', 'ChatGPT'],
  ['gemini', 'Gemini'],
  ['claude', 'Claude'],
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
  ['math', '数学'],
  ['science', '科学'],
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

  return output
    .replace(/\bintroduces?\b/gi, '发布')
    .replace(/\bannounces?\b/gi, '宣布')
    .replace(/\breleases?\b/gi, '发布')
    .replace(/\blaunches?\b/gi, '推出')
    .replace(/\bimproves?\b/gi, '提升')
    .replace(/\bnew ways to\b/gi, '新的方式来')
    .replace(/\bfor\b/gi, '用于')
    .replace(/\bwith\b/gi, '并带来')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchRule(text = '', keywords = []) {
  return keywords.reduce((score, keyword) => {
    if (text.includes(keyword)) return score + 3;
    return score;
  }, 0);
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
    if (lowered.includes(en)) {
      matches.push({ en, zh });
    }
  }

  const top = uniqueStrings(matches.slice(0, 2).map(match => match.en));
  const topZh = uniqueStrings(matches.slice(0, 2).map(match => match.zh));
  return {
    topicEn: top.length ? top.join(' and ') : theme.topicEn,
    topicZh: topZh.length ? topZh.join('、') : theme.topicZh,
  };
}

function pickEvidenceSentences(item) {
  const evidence = uniqueStrings([
    ...(item.evidenceSentences || []),
    ...sentenceSplit(item.bodySummary || ''),
    ...sentenceSplit(item.contentSnippet || ''),
  ]);

  return evidence
    .filter(line => line.length >= 40)
    .slice(0, 3);
}

function actionLabelZh(action) {
  switch (action) {
    case 'open-source': return '开源';
    case 'integration': return '推进';
    case 'research': return '公布';
    case 'tutorial': return '拆解';
    case 'commercial': return '产品化';
    case 'release': return '发布';
    case 'benchmark': return '刷新';
    default: return '更新';
  }
}

function composeWhatChangedEn(actor, action, topicEn, theme) {
  switch (action) {
    case 'open-source':
      return `${actor} turned work around ${topicEn} into something the wider ecosystem can inspect, adapt, and build on.`;
    case 'integration':
      return `${actor} pushed ${topicEn} deeper into product and developer workflows, with a clear emphasis on ${theme.focusEn}.`;
    case 'research':
      return `${actor} published a research-driven update around ${topicEn}, aimed at ${theme.focusEn}.`;
    case 'tutorial':
      return `${actor} published a hands-on walkthrough around ${topicEn}, showing how the capability can be operationalized.`;
    case 'commercial':
      return `${actor} linked ${topicEn} to a more productized rollout, suggesting a stronger go-to-market push.`;
    case 'release':
      return `${actor} rolled out a new move around ${topicEn}, extending its push on ${theme.focusEn}.`;
    case 'benchmark':
      return `${actor} framed ${topicEn} as a performance or evaluation step-change rather than a minor incremental tweak.`;
    default:
      return `${actor} published a meaningful update around ${topicEn}.`;
  }
}

function composeWhatChangedZh(actor, action, topicZh, theme) {
  switch (action) {
    case 'open-source':
      return `${actor}${actionLabelZh(action)}了围绕${topicZh}的工作，让外部生态可以更直接地复用、检查和二次构建。`;
    case 'integration':
      return `${actor}把${topicZh}进一步推进到产品和开发者工作流里，重点放在${theme.focusZh}。`;
    case 'research':
      return `${actor}${actionLabelZh(action)}了一项围绕${topicZh}的研究型更新，目标是${theme.focusZh}。`;
    case 'tutorial':
      return `${actor}${actionLabelZh(action)}了一个围绕${topicZh}的实践说明，展示这类能力如何进入真实工程。`;
    case 'commercial':
      return `${actor}把${topicZh}和更明确的产品化动作绑定在一起，说明它正在往业务化入口推进。`;
    case 'release':
      return `${actor}${actionLabelZh(action)}了一个围绕${topicZh}的新动作，继续沿着“${theme.focusZh}”这条线推进。`;
    case 'benchmark':
      return `${actor}把${topicZh}放进了更强的性能或评测叙事里，这不只是一次小修小补。`;
    default:
      return `${actor}发布了一条围绕${topicZh}的重要更新。`;
  }
}

function composeEvidenceBridge(evidence, language) {
  if (!evidence.length) return '';
  if (language === 'zh') {
    return `正文里最值得记下的信号是：${replaceTermsZh(trimText(evidence[0], 160))}`;
  }
  return `The strongest signal in the article is: ${trimText(evidence[0], 180)}`;
}

function buildLocalizedTitleZh(item, actor, action, topicZh) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  if (containsChinese(originalTitle)) return originalTitle;
  return `${actor}${actionLabelZh(action)}${topicZh}`;
}

function buildCardHeadlineEn(item, actor, action, topicEn) {
  const originalTitle = cleanText(item.title || item.pageTitle || '');
  if (originalTitle) return originalTitle;
  return `${actor} update on ${topicEn}`;
}

function buildBodyNote(bodyFetched, language, bodyWordCount) {
  if (bodyFetched) {
    return language === 'zh'
      ? `已抓取原文正文（约 ${bodyWordCount || 0} 词）`
      : `Full article body fetched (~${bodyWordCount || 0} words)`;
  }
  return language === 'zh' ? '仅基于 RSS 摘要与标题' : 'Built from RSS snippet and title only';
}

function buildThemes(items = []) {
  const counts = new Map();
  for (const item of items) {
    const key = `${item.themeZh}__${item.themeEn}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [themeZh, themeEn] = key.split('__');
      return { themeZh, themeEn, count };
    })
    .sort((a, b) => b.count - a.count);
}

function buildBodyCoverage(items = []) {
  const targeted = items.filter(item => item.bodyFetchTargeted).length;
  const succeeded = items.filter(item => item.bodyFetched).length;
  const totalWords = items.reduce((sum, item) => sum + (item.bodyWordCount || 0), 0);
  return {
    targeted,
    succeeded,
    totalWords,
    ratio: targeted ? Number((succeeded / targeted).toFixed(2)) : 0,
  };
}

function buildItem(item, index) {
  const theme = inferTheme(item);
  const actor = inferActor(item);
  const analysisText = cleanText([
    item.title,
    item.pageTitle,
    item.contentSnippet,
    item.bodyText,
    item.reason,
  ].filter(Boolean).join(' '));
  const action = inferAction(analysisText);
  const topics = pickTopicLabels(analysisText, theme);
  const evidence = pickEvidenceSentences(item);
  const whatChangedEn = composeWhatChangedEn(actor, action, topics.topicEn, theme);
  const whatChangedZh = composeWhatChangedZh(actor, action, topics.topicZh, theme);
  const evidenceBridgeEn = composeEvidenceBridge(evidence, 'en');
  const evidenceBridgeZh = composeEvidenceBridge(evidence, 'zh');
  const whyItMattersEn = theme.whyEn;
  const whyItMattersZh = theme.whyZh;
  const watchNextEn = theme.watchEn;
  const watchNextZh = theme.watchZh;
  const summaryEn = trimText([whatChangedEn, evidenceBridgeEn, `Why it matters: ${whyItMattersEn}`].filter(Boolean).join(' '), 360);
  const summaryZh = trimText([whatChangedZh, evidenceBridgeZh, `为什么值得看：${whyItMattersZh}`].filter(Boolean).join(' '), 220);
  const labels = relativeTimeLabels(item.pubDate || item.publishedAt);

  return {
    id: item.id,
    rank: index + 1,
    titleZh: buildLocalizedTitleZh(item, actor, action, topics.topicZh),
    titleEn: buildCardHeadlineEn(item, actor, action, topics.topicEn),
    kickerZh: `${actor} · ${theme.themeZh}`,
    kickerEn: `${actor} · ${theme.themeEn}`,
    summaryZh,
    summaryEn,
    deckZh: trimText(whatChangedZh, 88),
    deckEn: trimText(whatChangedEn, 150),
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
    takeawayBulletsZh: [
      `发生了什么：${whatChangedZh}`,
      `为什么重要：${whyItMattersZh}`,
      `接下来观察：${watchNextZh}`,
    ],
    takeawayBulletsEn: [
      `What changed: ${whatChangedEn}`,
      `Why it matters: ${whyItMattersEn}`,
      `What to watch: ${watchNextEn}`,
    ],
    evidenceBulletsZh: evidence.length ? evidence.map(line => replaceTermsZh(trimText(line, 160))) : [buildBodyNote(Boolean(item.bodyFetched), 'zh', item.bodyWordCount)],
    evidenceBulletsEn: evidence.length ? evidence.map(line => trimText(line, 180)) : [buildBodyNote(Boolean(item.bodyFetched), 'en', item.bodyWordCount)],
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
    sourceNoteZh: buildBodyNote(Boolean(item.bodyFetched), 'zh', item.bodyWordCount),
    sourceNoteEn: buildBodyNote(Boolean(item.bodyFetched), 'en', item.bodyWordCount),
  };
}

export function buildDigestItems(candidates = []) {
  return candidates.map((item, index) => buildItem(item, index));
}

export function buildDigestDetail({ date, items, windowHours, digestUrl, generatedAt, limitedUpdateWindow }) {
  const themes = buildThemes(items);
  const bodyCoverage = buildBodyCoverage(items);
  const topThemesZh = themes.slice(0, 3).map(item => item.themeZh).join('、') || 'AI 重点更新';
  const topThemesEn = themes.slice(0, 3).map(item => item.themeEn).join(', ') || 'high-signal AI updates';

  const introZh = items.length
    ? `这期只保留近 ${windowHours} 小时里最值得继续跟进的 ${items.length} 条 AI 更新，主线集中在 ${topThemesZh}。${bodyCoverage.succeeded ? `其中 ${bodyCoverage.succeeded} 条补抓了原文正文，所以解释不只停留在 RSS 片段。` : '这期没有成功抓到更多原文正文，因此会明确标注哪些解读只来自 RSS 摘要。'}`
    : `这期只检查了近 ${windowHours} 小时的 AI 更新，但没有筛到足够值得展开的条目。`;

  const introEn = items.length
    ? `This issue keeps only the ${items.length} highest-signal AI updates from the last ${windowHours} hours, concentrated around ${topThemesEn}. ${bodyCoverage.succeeded ? `${bodyCoverage.succeeded} of them include fetched full article bodies, so the commentary goes beyond RSS snippets.` : 'No additional article bodies were fetched successfully this time, so the issue clearly marks where it relies on RSS-level evidence.'}`
    : `This issue only checked the last ${windowHours} hours, but there were not enough high-signal items worth expanding.`;

  const methodologyZh = '方法：先抓 RSS 候选，再对高价值条目优先抓原文正文，最后用本地规则生成中英双语 briefing；如果正文抓取失败，会明确说明。';
  const methodologyEn = 'Method: RSS candidates first, then full-body fetches for high-value items, then local rule-based bilingual briefing generation. If full-body fetch fails, the issue says so explicitly.';

  const titleZh = `${date} AI 日报：${items[0]?.titleZh || '近 24 小时重点更新'}`;
  const titleEn = `${date} AI Daily Briefing`;
  const excerptZh = items.length
    ? `${introZh}${limitedUpdateWindow ? ` 另外，近 ${windowHours} 小时高价值更新有限，所以没有混入更早内容。` : ''}`
    : `近 ${windowHours} 小时重点更新有限，今天不混入更早内容。`;
  const excerptEn = items.length
    ? `${introEn}${limitedUpdateWindow ? ' High-signal updates were limited, so older items were intentionally excluded.' : ''}`
    : `Updates in the last ${windowHours} hours were limited, so older items were intentionally excluded.`;

  return {
    slug: `ai-daily-${date}`,
    date,
    titleZh,
    titleEn,
    excerptZh,
    excerptEn,
    issueSummaryZh: introZh,
    issueSummaryEn: introEn,
    introZh,
    introEn,
    methodologyZh,
    methodologyEn,
    path: `/blog/ai-daily-${date}`,
    digestUrl,
    itemCount: items.length,
    heroTitleZh: items[0]?.titleZh || '',
    heroTitleEn: items[0]?.titleEn || '',
    limitedUpdateWindow,
    generatedAt,
    windowHours,
    themes,
    bodyCoverage,
    featuredItems: items.slice(0, 3).map(item => ({
      id: item.id,
      titleZh: item.titleZh,
      titleEn: item.titleEn,
      tag: item.tag,
      summaryZh: item.summaryZh,
      summaryEn: item.summaryEn,
      whyItMattersZh: item.whyItMattersZh,
      whyItMattersEn: item.whyItMattersEn,
      publishedLabelZh: item.publishedLabelZh,
      publishedLabelEn: item.publishedLabelEn,
    })),
    items,
  };
}

export function buildDigestMarkdown(detail) {
  const enBody = detail.items.length
    ? detail.items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleEn}\n\n**At a glance**\n${item.summaryEn}\n\n**Why it matters**\n- ${item.takeawayBulletsEn.join('\n- ')}\n\n**Evidence**\n- ${item.evidenceBulletsEn.join('\n- ')}\n\n**Source note**\n- ${item.sourceNoteEn}\n\n**Links**\n${item.relatedLinks.map(link => `- [${link.labelEn}](${link.url})`).join('\n')}`).join('\n\n---\n\n')
    : 'No briefing today.';

  const zhBody = detail.items.length
    ? detail.items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleZh}\n\n**一句话判断**\n${item.summaryZh}\n\n**为什么值得跟进**\n- ${item.takeawayBulletsZh.join('\n- ')}\n\n**正文证据**\n- ${item.evidenceBulletsZh.join('\n- ')}\n\n**来源说明**\n- ${item.sourceNoteZh}\n\n**相关链接**\n${item.relatedLinks.map(link => `- [${link.labelZh}](${link.url})`).join('\n')}`).join('\n\n---\n\n')
    : '近 24 小时重点更新有限，今天不混入更早内容。';

  return `---\nkind: "digest"\ntitleZh: "${escapeFrontmatter(detail.titleZh)}"\ntitleEn: "${escapeFrontmatter(detail.titleEn)}"\nexcerptZh: "${escapeFrontmatter(detail.excerptZh)}"\nexcerptEn: "${escapeFrontmatter(detail.excerptEn)}"\ntag: "AI 日报"\ntagEn: "AI Daily"\nreadTime: ${Math.max(8, Math.round(detail.items.length * 4.5))}\ndate: ${detail.date}\n---\n\n<!-- CONTENT_EN -->\n> ${detail.methodologyEn}\n\n${detail.introEn}\n\n${enBody}\n\n<!-- CONTENT_ZH -->\n> ${detail.methodologyZh}\n\n${detail.introZh}\n\n${zhBody}\n`;
}

export function buildDigestReport(detail) {
  const topLinesZh = detail.items.slice(0, 4).map((item, index) => `${index + 1}. ${item.titleZh} —— ${trimText(item.deckZh || item.summaryZh, 70)}`);
  const topLinesEn = detail.items.slice(0, 3).map((item, index) => `${index + 1}. ${item.titleEn} — ${trimText(item.deckEn || item.summaryEn, 90)}`);

  const messageZh = [
    `✅ AI 日报更新成功（${detail.date}）`,
    `网站地址：<${detail.digestUrl}>`,
    `口径：只看近 ${detail.windowHours} 小时；高价值条目优先抓正文（${detail.bodyCoverage.succeeded}/${detail.bodyCoverage.targeted || detail.items.length}）。`,
    detail.limitedUpdateWindow ? `说明：近 ${detail.windowHours} 小时高价值更新有限，所以没有混入更早内容。` : '',
    '今日主线：',
    ...topLinesZh,
  ].filter(Boolean).join('\n');

  const messageEn = [
    `✅ AI digest updated successfully (${detail.date})`,
    `Digest URL: <${detail.digestUrl}>`,
    `Scope: last ${detail.windowHours} hours only; full-body fetches for high-value items (${detail.bodyCoverage.succeeded}/${detail.bodyCoverage.targeted || detail.items.length}).`,
    detail.limitedUpdateWindow ? 'Note: high-signal updates were limited, so older items were intentionally excluded.' : '',
    'Top lines:',
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
