import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const POSTS_DIR = path.join(ROOT, 'posts');
const CANDIDATES_FILE = path.join(DATA_DIR, 'ai-candidates.json');
const TECH_NEWS_FILE = path.join(DATA_DIR, 'tech-news.json');
const DIGESTS_FILE = path.join(DATA_DIR, 'ai-digests.json');
const REPORT_FILE = path.join(DATA_DIR, 'ai-digest-report.txt');
const SITE_URL = (process.env.SITE_URL || 'https://guangtaos29545.github.io/thomas-blog').replace(/\/$/, '');
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const POST_SLUG = `ai-daily-${TODAY}`;
const POST_FILENAME = `${TODAY}-${POST_SLUG}.md`;
const POST_PATH = path.join(POSTS_DIR, POST_FILENAME);
const WINDOW_HOURS = Number.parseInt(process.env.AI_DIGEST_WINDOW_HOURS || '24', 10);
const MAX_ITEMS = Number.parseInt(process.env.AI_DIGEST_MAX_ITEMS || '6', 10);
const SUFFICIENT_ITEMS = Number.parseInt(process.env.AI_DIGEST_SUFFICIENT_ITEMS || '4', 10);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function clean(text = '') {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimSentence(text = '', max = 140) {
  const normalized = clean(text);
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  const sliced = normalized.slice(0, max);
  const lastStop = Math.max(sliced.lastIndexOf('。'), sliced.lastIndexOf('；'), sliced.lastIndexOf('. '), sliced.lastIndexOf('; '), sliced.lastIndexOf('，'), sliced.lastIndexOf(', '));
  return `${(lastStop > 48 ? sliced.slice(0, lastStop) : sliced).trim()}…`;
}

function normalizeTitle(title = '') {
  return clean(title).toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function hoursAgoText(input) {
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return '';
  const hours = Math.max(0, Math.round((Date.now() - ts) / 36e5));
  if (hours < 1) return '1 小时内';
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.round(hours / 24)} 天前`;
}

function keywordTag(text = '') {
  const t = text.toLowerCase();
  if (/(security|safety|guardrail|prompt injection|vulnerability)/i.test(t)) return 'Security';
  if (/(open source|apache|mit|github|hugging face|hf|model card)/i.test(t)) return 'Open Source';
  if (/(chip|gpu|infra|inference|deployment|server|cloud|datacenter|storage)/i.test(t)) return 'Infrastructure';
  if (/(copilot|agent|cli|developer|tool|workflow|coding)/i.test(t)) return 'Tools';
  if (/(data|dataset|benchmark|evaluation|embedding)/i.test(t)) return 'Data';
  return 'AI';
}

function inferTheme(item) {
  const text = `${item.title} ${item.contentSnippet} ${item.categoryHint || ''}`.toLowerCase();
  if (/(education|learn|math|science|student)/.test(text)) return 'AI 产品体验';
  if (/(prompt injection|safety|hierarchy|guardrail|security)/.test(text)) return '模型安全与可控性';
  if (/(embedding|rag|retrieval|multimodal|vector)/.test(text)) return '检索与多模态基础能力';
  if (/(copilot|agent|workflow|developer|sdk|execution|tool)/.test(text)) return 'Agent 与开发者工具';
  if (/(data|dataset|benchmark|open data)/.test(text)) return '数据基础设施';
  if (/(storage|bucket|hub|infra|inference|gpu|cloud)/.test(text)) return 'AI 基础设施';
  if (/(rl|training|library|libraries)/.test(text)) return '训练方法与工程实践';
  return 'AI 进展';
}

function explainWhyImportant(item) {
  const text = `${item.title} ${item.contentSnippet} ${item.categoryHint || ''}`.toLowerCase();
  if (/(prompt injection|safety|hierarchy|guardrail)/.test(text)) {
    return '这类更新影响的不只是论文指标，而是模型在真实产品里能否更稳定地遵守高优先级指令，直接关系到安全性、企业采用门槛和 Agent 可控性。';
  }
  if (/(learn|math|science|student|education)/.test(text)) {
    return '它说明大模型产品正在从“会回答”走向“会讲解”，竞争点开始转向交互式教学体验、留存和使用深度，而不只是模型分数。';
  }
  if (/(embedding|rag|retrieval|multimodal|vector)/.test(text)) {
    return '这类能力会直接影响搜索、推荐、知识库和多模态检索系统的效果，是很多 AI 应用是否好用的底层能力。';
  }
  if (/(copilot|agent|sdk|execution|workflow|developer)/.test(text)) {
    return '它反映行业焦点正在从聊天界面转向可执行工作流，谁能把模型接进真实软件和自动化链路，谁就更接近生产力入口。';
  }
  if (/(storage|bucket|hub|infra|gpu|cloud|inference)/.test(text)) {
    return '基础设施层的变化通常不会最吸睛，但会改变团队部署模型、管理数据和控制成本的方式，影响面往往比单个功能更大。';
  }
  if (/(open data|dataset|benchmark)/.test(text)) {
    return '数据供给决定模型上限，这类消息通常意味着训练资源、评测标准或开源生态又在往前走一步。';
  }
  return '它值得看，不只是因为有新发布，而是因为它能帮助判断 AI 产业的竞争焦点正在往哪里移动。';
}

function explainImpact(item) {
  const text = `${item.title} ${item.contentSnippet} ${item.categoryHint || ''}`.toLowerCase();
  if (/(prompt injection|safety|hierarchy|guardrail)/.test(text)) {
    return '对开发者和企业来说，后续要关注它会不会进入 API、系统提示控制或评测基线；一旦产品化，很多高风险场景的接入成本会下降。';
  }
  if (/(learn|math|science|student|education)/.test(text)) {
    return '短期会推动 AI 教育产品继续内卷，长期可能改变用户对“搜索答案”和“理解过程”之间的期待。';
  }
  if (/(embedding|rag|retrieval|multimodal|vector)/.test(text)) {
    return '如果效果和成本比真的拉开差距，RAG、企业知识库和跨模态搜索的方案会很快跟进，工具链也会随之调整。';
  }
  if (/(copilot|agent|sdk|execution|workflow|developer)/.test(text)) {
    return '这会让软件产品更倾向于内置可编排 Agent，而不是只加一个聊天框，开发者生态和平台分发方式都会受影响。';
  }
  if (/(storage|bucket|hub|infra|gpu|cloud|inference)/.test(text)) {
    return '对团队的直接影响通常体现在成本、吞吐、协作和可扩展性上，属于“看起来不热闹，但非常决定交付效率”的变化。';
  }
  return '更实际的看点是：它会不会很快进入产品、开发者工作流或开源生态，而不只是停留在宣传层。';
}

function explainWhatHappened(item) {
  const base = trimSentence(item.contentSnippet || '', 180);
  if (base) return base;
  return `${clean(item.title)} 这条更新目前公开摘要不多，但从标题和来源看，属于 ${inferTheme(item)} 方向的新进展。`;
}

function buildItems(candidates) {
  return candidates.map((item, index) => {
    const titleZh = clean(item.title);
    const titleEn = clean(item.title);
    const tag = item.categoryHint || keywordTag(`${item.title} ${item.contentSnippet}`);
    const themeZh = inferTheme(item);
    const whatZh = explainWhatHappened(item);
    const whyZh = explainWhyImportant(item);
    const impactZh = explainImpact(item);
    const summaryZh = `这条来自 ${item.sourceName || item.sourceDomain} 的更新，核心是：${whatZh} 它属于“${themeZh}”这个主题，值得关注的原因是：${whyZh}`;
    const summaryEn = trimSentence(`${whatZh} Theme: ${themeZh}. Why it matters: ${whyZh}`, 220);
    const deckZh = `发生了什么：${whatZh}`;
    const takeawayBulletsZh = [
      `为什么重要：${whyZh}`,
      `相关主题：${themeZh}`,
      `可能影响：${impactZh}`,
    ];

    return {
      id: item.id,
      rank: index + 1,
      titleZh,
      titleEn,
      summaryZh,
      summaryEn,
      deckZh,
      tag,
      source: item.sourceDomain,
      sourceName: item.sourceName,
      sourceUrl: item.link,
      relatedLinks: [
        { labelZh: `${item.sourceName || item.sourceDomain} 原文`, labelEn: `${item.sourceName || item.sourceDomain} source`, url: item.link },
        item.sourceUrl ? { labelZh: 'RSS 源', labelEn: 'RSS feed', url: item.sourceUrl } : null,
      ].filter(Boolean),
      publishedAt: item.pubDate || item.publishedAt,
      publishedLabelZh: hoursAgoText(item.pubDate || item.publishedAt),
      score: item.score,
      featured: index < 3,
      takeawayBulletsZh,
      themeZh,
      impactZh,
    };
  });
}

function buildMarkdown(date, items, meta) {
  const top = items[0];
  const titleZh = `${date} AI 日报：${top ? top.titleZh : '近 24 小时重点更新'}`;
  const titleEn = `${date} AI Daily Briefing`;
  const lead = items.length
    ? `这期只保留近 ${WINDOW_HOURS} 小时内的 AI 更新。共整理 ${items.length} 条，优先覆盖产品、模型能力、开发工具和基础设施里最值得继续跟进的变化。`
    : `这期只检查了近 ${WINDOW_HOURS} 小时的 AI 更新，但没有筛到足够值得单独展开的条目。`;
  const shortageNote = meta.hasLimitedUpdateNote
    ? `近 ${WINDOW_HOURS} 小时重点更新有限，所以这期不为了凑数混入更早内容。`
    : '';
  const excerptZh = items.length
    ? `${lead}${shortageNote ? ` ${shortageNote}` : ''}`
    : `近 ${WINDOW_HOURS} 小时重点更新有限，今天不混入更早内容。`;
  const excerptEn = items.length
    ? `Focused on the last ${WINDOW_HOURS} hours only, with ${items.length} items selected.${meta.hasLimitedUpdateNote ? ' High-signal updates were limited, so older items were intentionally excluded.' : ''}`
    : `Updates in the last ${WINDOW_HOURS} hours were limited, so older items were intentionally excluded.`;

  const zhIntro = [lead, shortageNote].filter(Boolean).join('\n\n');
  const zhBody = items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleZh}\n\n${item.deckZh}\n\n**为什么这件事重要：**\n${item.takeawayBulletsZh.map(line => `- ${line}`).join('\n')}\n\n**延伸说明：**\n${item.summaryZh}\n\n**相关链接：**\n${item.relatedLinks.map(link => `- [${link.labelZh}](${link.url})`).join('\n')}`).join('\n\n---\n\n');
  const enBody = items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleEn}\n\n${item.summaryEn}\n\n**Links**\n${item.relatedLinks.map(link => `- [${link.labelEn}](${link.url})`).join('\n')}`).join('\n\n---\n\n');

  return `---\ntitleZh: "${titleZh.replace(/"/g, '\\"')}"\ntitleEn: "${titleEn.replace(/"/g, '\\"')}"\nexcerptZh: "${excerptZh.replace(/"/g, '\\"')}"\nexcerptEn: "${excerptEn.replace(/"/g, '\\"')}"\ntag: "AI"\ntagEn: "AI"\nreadTime: ${Math.max(6, Math.round(items.length * 3.5))}\ndate: ${date}\n---\n\n<!-- CONTENT_EN -->\n${enBody || 'No briefing today.'}\n\n<!-- CONTENT_ZH -->\n${zhIntro || '近 24 小时重点更新有限。'}\n\n${zhBody || '近 24 小时重点更新有限，今天不混入更早内容。'}\n`;
}

function buildReport(date, digestUrl, items, meta) {
  if (!items.length) {
    return `AI 日报已检查完成（${date}）。近 ${WINDOW_HOURS} 小时重点更新有限，所以今天不混入更早内容，站点暂不扩写旧消息。`;
  }

  const lines = [
    `AI 日报已更新（${date}）`,
    '',
    `口径：只保留近 ${WINDOW_HOURS} 小时内容。${meta.hasLimitedUpdateNote ? '近 24 小时重点更新有限，本次没有回填更早消息。' : ''}`,
    '',
    '今天重点：',
    ...items.slice(0, 4).map((item, index) => `${index + 1}. ${item.titleZh} —— ${trimSentence(item.summaryZh, 72)}`),
    '',
    `已生成站内日报页面：<${digestUrl}>`,
    '这次把卡片、日报正文和归档层级拆开了：卡片只做预览，正文负责解释，归档不再重复当天摘要。',
  ];

  return lines.join('\n');
}

function isWithinWindow(item) {
  const ts = new Date(item.pubDate || item.publishedAt || '').getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= WINDOW_HOURS * 36e5;
}

function dedupeCandidates(items) {
  const seenLinks = new Set();
  const seenTitles = new Set();
  const result = [];

  for (const item of items) {
    const link = item.link || item.sourceUrl;
    const titleKey = normalizeTitle(item.title || item.titleZh || item.titleEn || '');
    if (!link || !titleKey) continue;
    if (seenLinks.has(link) || seenTitles.has(titleKey)) continue;
    seenLinks.add(link);
    seenTitles.add(titleKey);
    result.push(item);
  }

  return result;
}

ensureDir(DATA_DIR);
ensureDir(POSTS_DIR);

const candidatesPayload = loadJson(CANDIDATES_FILE, { items: [] });
const freshCandidates = dedupeCandidates((candidatesPayload.items || []).filter(isWithinWindow))
  .sort((a, b) => (b.score || 0) - (a.score || 0));
const selectedCandidates = freshCandidates.slice(0, MAX_ITEMS);
const items = buildItems(selectedCandidates);
const digestUrl = `${SITE_URL}/blog/${POST_SLUG}`;
const meta = {
  windowHours: WINDOW_HOURS,
  hasLimitedUpdateNote: items.length > 0 && items.length < SUFFICIENT_ITEMS,
};

fs.writeFileSync(TECH_NEWS_FILE, JSON.stringify(items, null, 2));

const digestIndex = loadJson(DIGESTS_FILE, []);
const todayDigest = {
  slug: POST_SLUG,
  date: TODAY,
  titleZh: `${TODAY} AI 日报`,
  titleEn: `${TODAY} AI Daily Briefing`,
  excerptZh: items.length
    ? `${items[0].summaryZh}${meta.hasLimitedUpdateNote ? ` 另外，近 ${WINDOW_HOURS} 小时重点更新有限，所以没有补入更早内容。` : ''}`
    : `近 ${WINDOW_HOURS} 小时重点更新有限，今天不混入更早内容。`,
  excerptEn: items.length
    ? `${items[0].summaryEn}${meta.hasLimitedUpdateNote ? ' Updates were limited in the last 24 hours, so older items were intentionally excluded.' : ''}`
    : `Updates were limited in the last ${WINDOW_HOURS} hours, so older items were intentionally excluded.`,
  path: `/blog/${POST_SLUG}`,
  itemCount: items.length,
  heroTitleZh: items[0]?.titleZh || '',
  heroTitleEn: items[0]?.titleEn || '',
  limitedUpdateWindow: meta.hasLimitedUpdateNote,
  featuredItems: items.slice(0, 3).map(item => ({
    id: item.id,
    titleZh: item.titleZh,
    titleEn: item.titleEn,
    tag: item.tag,
    summaryZh: item.summaryZh,
    publishedLabelZh: item.publishedLabelZh,
  })),
};
const mergedDigests = [todayDigest, ...digestIndex.filter(item => item.slug !== POST_SLUG)].sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(DIGESTS_FILE, JSON.stringify(mergedDigests, null, 2));
fs.writeFileSync(POST_PATH, buildMarkdown(TODAY, items, meta));
fs.writeFileSync(REPORT_FILE, buildReport(TODAY, digestUrl, items, meta));

console.log(`[digest] window ${WINDOW_HOURS}h -> ${freshCandidates.length} fresh candidates, selected ${items.length}`);
console.log(`[digest] wrote ${TECH_NEWS_FILE}`);
console.log(`[digest] wrote ${DIGESTS_FILE}`);
console.log(`[digest] wrote ${POST_PATH}`);
console.log(`[digest] wrote ${REPORT_FILE}`);
