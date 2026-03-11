import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const CANDIDATES_FILE = path.join(DATA_DIR, 'ai-candidates.json');
const TECH_NEWS_FILE = path.join(DATA_DIR, 'tech-news.json');
const REPORT_FILE = path.join(DATA_DIR, 'ai-digest-report.txt');

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const candidatesPayload = loadJson(CANDIDATES_FILE, { items: [] });
const candidates = candidatesPayload.items || [];
const existing = loadJson(TECH_NEWS_FILE, []);

const curatedConfig = [
  {
    match: /instruction hierarchy/i,
    titleZh: 'OpenAI 提升前沿 LLM 的指令层级能力',
    summaryZh: 'OpenAI 发布 IH-Challenge，核心是让模型更清楚地区分高可信与低可信指令，从而增强安全可控性，并提升对 prompt injection 的抵抗力。',
    summaryEn: 'OpenAI introduced IH-Challenge to improve instruction hierarchy handling, steerability, and resilience against prompt injection.',
    tag: 'AI', featured: true,
  },
  {
    match: /learn math and science in chatgpt/i,
    titleZh: 'ChatGPT 上线更适合学习数理的交互式讲解',
    summaryZh: 'ChatGPT 开始加入更强的可视化与互动式讲解能力，数学和科学学习场景明显更像“交互教具”而不只是问答框。',
    summaryEn: 'ChatGPT is becoming a more interactive learning tool for math and science, moving beyond plain text Q&A.',
    tag: 'AI', featured: true,
  },
  {
    match: /open data for ai/i,
    titleZh: 'NVIDIA 解释如何构建面向 AI 的开放数据',
    summaryZh: '文章聚焦 NVIDIA 如何建设开放数据体系，重点价值在于训练数据工程、质量治理和生态协作。',
    summaryEn: 'The post outlines how NVIDIA approaches open data for AI, with practical signals on data engineering and ecosystem design.',
    tag: 'Open Source', featured: true,
  },
  {
    match: /gemini in google sheets/i,
    titleZh: 'Gemini 在 Google Sheets 中拿到更强的数据分析能力',
    summaryZh: 'Google 正在把 Gemini 从“表格助手”往“自然语言驱动的数据分析接口”推进，办公 AI agent 味道越来越浓。',
    summaryEn: 'Google is pushing Gemini in Sheets toward a stronger natural-language interface for spreadsheet analysis and editing.',
    tag: 'AI', featured: true,
  },
  {
    match: /execution is the new interface/i,
    titleZh: 'GitHub：AI 不再只是文本接口，执行才是新界面',
    summaryZh: 'GitHub 的判断很明确：下一阶段 AI 产品的核心不是聊天，而是进入可执行工作流，把 agent 能力嵌进应用本身。',
    summaryEn: 'GitHub argues that execution, not chat alone, is becoming the defining AI interface for software workflows.',
    tag: 'Tools', featured: true,
  },
  {
    match: /16 open-source rl libraries/i,
    titleZh: '16 个开源 RL 库的经验总结：训练系统开始卷工程效率',
    summaryZh: '这篇总结的重点不在算法花样，而在异步训练、吞吐与工程权衡，说明训练基础设施仍然是高价值方向。',
    summaryEn: 'A review of 16 open-source RL libraries highlights async training, throughput, and system tradeoffs over novelty for novelty’s sake.',
    tag: 'Open Source', featured: false,
  },
  {
    match: /storage buckets/i,
    titleZh: 'Hugging Face Hub 推出 Storage Buckets',
    summaryZh: 'Hugging Face 正在继续下探到更底层的基础设施层，说明它的目标不只是模型托管，而是更完整的 AI 开发平台。',
    summaryEn: 'Storage Buckets suggest Hugging Face is expanding further into foundational infrastructure for AI teams.',
    tag: 'Infrastructure', featured: false,
  },
  {
    match: /better code/i,
    titleZh: 'Simon Willison：AI 应该帮助我们写出更好的代码',
    summaryZh: '如果引入 coding agent 后代码质量下降，问题不该怪在“用了 AI”，而该回到流程、评审和反馈机制本身。',
    summaryEn: 'Simon Willison argues that if coding agents reduce quality, teams should repair the process instead of normalizing worse code.',
    tag: 'Tools', featured: false,
  },
  {
    match: /granite 4\.0 1b speech/i,
    titleZh: 'IBM Granite 4.0 1B Speech 指向更实用的边缘语音模型',
    summaryZh: '更小、更轻、支持多语言的语音模型正变得更实用，边缘部署和低成本推理会继续升温。',
    summaryEn: 'IBM’s compact Granite speech model reinforces the trend toward practical multilingual models for edge deployment.',
    tag: 'AI', featured: false,
  },
  {
    match: /security architecture of github agentic workflows/i,
    titleZh: 'GitHub 拆解 Agentic Workflows 的安全架构',
    summaryZh: '隔离、受限输出、审计日志，这些 agent 落地到生产环境时真正关键的安全能力，GitHub 这篇讲得很实。',
    summaryEn: 'GitHub’s security breakdown focuses on the practical foundations for running agent workflows safely in production.',
    tag: 'Security', featured: false,
  },
  {
    match: /acquire promptfoo/i,
    titleZh: 'OpenAI 将收购 Promptfoo，AI 安全工具战略价值上升',
    summaryZh: '这说明模型安全与评测能力正在进一步前置到开发流程里，AI security tooling 的重要性继续走高。',
    summaryEn: 'OpenAI’s planned Promptfoo acquisition highlights the increasing strategic importance of AI evaluation and security tooling.',
    tag: 'Security', featured: false,
  },
  {
    match: /nemotron-terminal/i,
    titleZh: 'NVIDIA 的 Nemotron-Terminal 押注终端 Agent 的数据工程',
    summaryZh: '亮点不只是 agent 本身，而是围绕终端 agent 训练数据流水线的方法论，这比单个模型发布更值得盯。',
    summaryEn: 'NVIDIA’s Nemotron-Terminal stands out for its data-engineering pipeline around terminal agents, not just the model label itself.',
    tag: 'AI', featured: false,
  }
];

function pickSummary(item) {
  for (const cfg of curatedConfig) {
    if (cfg.match.test(item.title)) return cfg;
  }
  return null;
}

const curated = [];
for (const item of candidates) {
  const cfg = pickSummary(item);
  if (!cfg) continue;
  curated.push({
    id: item.id,
    titleEn: item.title,
    titleZh: cfg.titleZh,
    summaryEn: cfg.summaryEn,
    summaryZh: cfg.summaryZh,
    tag: cfg.tag,
    source: item.sourceDomain,
    sourceUrl: item.link,
    publishedAt: item.publishedAt,
    score: item.score,
    featured: cfg.featured,
  });
}

const curatedIds = new Set(curated.map(item => item.id));
const merged = [...curated, ...existing.filter(item => !curatedIds.has(item.id))].slice(0, 60);
fs.writeFileSync(TECH_NEWS_FILE, JSON.stringify(merged, null, 2));

const lines = [];
lines.push(`AI 日报（${new Date().toISOString().slice(0, 10)}）`);
lines.push('');
if (curated.length === 0) {
  lines.push('今天没有筛到足够值得推送的新条目，网站保持原样。');
} else {
  lines.push('今日重点：');
  for (const item of curated.slice(0, 8)) {
    lines.push(`- ${item.titleZh}：${item.summaryZh}`);
  }
  lines.push('');
  lines.push('网站已更新。');
}
fs.writeFileSync(REPORT_FILE, lines.join('\n'));
console.log(`[digest] curated ${curated.length} items`);
console.log(`[digest] wrote ${TECH_NEWS_FILE}`);
console.log(`[digest] wrote ${REPORT_FILE}`);
