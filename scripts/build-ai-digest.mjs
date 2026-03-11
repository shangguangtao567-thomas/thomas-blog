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
const TODAY = new Date().toISOString().slice(0, 10);
const POST_SLUG = `ai-daily-${TODAY}`;
const POST_FILENAME = `${TODAY}-${POST_SLUG}.md`;
const POST_PATH = path.join(POSTS_DIR, POST_FILENAME);

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
  const lastStop = Math.max(sliced.lastIndexOf('。'), sliced.lastIndexOf('；'), sliced.lastIndexOf('. '), sliced.lastIndexOf('; '), sliced.lastIndexOf('，'));
  return `${(lastStop > 40 ? sliced.slice(0, lastStop) : sliced).trim()}…`;
}

function keywordTag(text = '') {
  const t = text.toLowerCase();
  if (/(security|safety|guardrail|prompt injection|vulnerability)/i.test(t)) return 'Security';
  if (/(open source|apache|mit|github|hugging face|hf|model card)/i.test(t)) return 'Open Source';
  if (/(chip|gpu|infra|inference|deployment|server|cloud|datacenter)/i.test(t)) return 'Infrastructure';
  if (/(copilot|agent|cli|developer|tool|workflow|coding)/i.test(t)) return 'Tools';
  if (/(data|dataset|benchmark|evaluation)/i.test(t)) return 'Data';
  return 'AI';
}

function summaryZh(item, index) {
  const base = clean(item.contentSnippet || '');
  const title = clean(item.title || '');
  const sourceHint = item.sourceName ? `来源于 ${item.sourceName}，` : '';
  const sentence = trimSentence(base, 110);
  const angle = [
    '更像是值得今天先看一眼的方向信号',
    '对产品、模型能力或生态节奏都有直接参考价值',
    '适合作为今天判断 AI 进展节奏的切片',
    '背后反映的是行业资源和注意力正在重新分配',
    '比单点新闻更像趋势拐点的局部证据',
  ][index % 5];

  if (sentence) return `${sourceHint}${sentence}。${angle}。`;
  return `${sourceHint}${title}。${angle}。`;
}

function summaryEn(item, index) {
  const base = trimSentence(item.contentSnippet || item.title || '', 150);
  const angle = [
    'Worth treating as an early signal, not just a headline.',
    'Useful for tracking where product and model momentum is shifting.',
    'A compact snapshot of today\'s AI execution layer.',
    'More interesting for the direction it implies than the announcement itself.',
    'A good proxy for where industry attention is moving next.',
  ][index % 5];
  return `${base || item.title}. ${angle}`;
}

function buildItems(candidates) {
  return candidates.map((item, index) => {
    const titleZh = clean(item.title);
    const titleEn = clean(item.title);
    const tag = item.categoryHint || keywordTag(`${item.title} ${item.contentSnippet}`);
    const takeawaysZh = [
      trimSentence(summaryZh(item, index), 80),
      trimSentence(`我会更关注它后续是否真的落到产品、开发者工作流或基础设施成本变化上。`, 80),
    ].filter(Boolean);

    return {
      id: item.id,
      rank: index + 1,
      titleZh,
      titleEn,
      summaryZh: summaryZh(item, index),
      summaryEn: summaryEn(item, index),
      tag,
      source: item.sourceDomain,
      sourceName: item.sourceName,
      sourceUrl: item.link,
      relatedLinks: [
        { labelZh: `${item.sourceName || item.sourceDomain} 原文`, labelEn: `${item.sourceName || item.sourceDomain} source`, url: item.link },
        item.sourceUrl ? { labelZh: 'RSS 源', labelEn: 'RSS feed', url: item.sourceUrl } : null,
      ].filter(Boolean),
      publishedAt: item.publishedAt,
      score: item.score,
      featured: index < 4,
      takeawayBulletsZh: takeawaysZh,
    };
  });
}

function buildMarkdown(date, items) {
  const top = items[0];
  const titleZh = `${date} AI 日报：${top ? top.titleZh : '今日精选'}`;
  const titleEn = `${date} AI Daily Briefing`;
  const excerptZh = items.length
    ? `今天挑了 ${items.length} 条值得先看的 AI 消息，重点包括 ${items.slice(0, 3).map(item => item.titleZh).join('、')}。`
    : '今天没有筛到足够值得单独成文的 AI 条目。';
  const excerptEn = items.length
    ? `A curated AI briefing for ${date}, featuring ${items.slice(0, 3).map(item => item.titleEn).join(', ')}.`
    : `No strong AI items were selected for ${date}.`;

  const zhBody = items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleZh}\n\n${item.summaryZh}\n\n**为什么值得看：**\n${item.takeawayBulletsZh.map(line => `- ${line}`).join('\n')}\n\n**相关链接：**\n${item.relatedLinks.map(link => `- [${link.labelZh}](${link.url})`).join('\n')}`).join('\n\n---\n\n');
  const enBody = items.map(item => `## ${String(item.rank).padStart(2, '0')} · ${item.titleEn}\n\n${item.summaryEn}\n\n**Links**\n${item.relatedLinks.map(link => `- [${link.labelEn}](${link.url})`).join('\n')}`).join('\n\n---\n\n');

  return `---\ntitleZh: "${titleZh.replace(/"/g, '\\"')}"\ntitleEn: "${titleEn.replace(/"/g, '\\"')}"\nexcerptZh: "${excerptZh.replace(/"/g, '\\"')}"\nexcerptEn: "${excerptEn.replace(/"/g, '\\"')}"\ntag: "AI"\ntagEn: "AI"\nreadTime: ${Math.max(6, Math.round(items.length * 2.5))}\ndate: ${date}\n---\n\n<!-- CONTENT_EN -->\n${enBody || 'No briefing today.'}\n\n<!-- CONTENT_ZH -->\n${zhBody || '今天没有筛到足够值得单独成文的 AI 条目。'}\n`;
}

function buildReport(date, digestUrl, items) {
  if (!items.length) {
    return `AI 日报已检查完成（${date}），今天没有筛到足够强的新条目，站点暂不更新。`;
  }

  const lines = [
    `AI 日报已更新（${date}）`,
    '',
    '今天重点：',
    ...items.slice(0, 4).map((item, index) => `${index + 1}. ${item.titleZh} —— ${trimSentence(item.summaryZh, 58)}`),
    '',
    `已生成站内日报页面：<${digestUrl}>`,
    '这次不是外链聚合页，而是站内可读的日报总览，文内保留了来源链接供继续深挖。',
  ];

  return lines.join('\n');
}

ensureDir(DATA_DIR);
ensureDir(POSTS_DIR);

const candidatesPayload = loadJson(CANDIDATES_FILE, { items: [] });
const candidates = (candidatesPayload.items || []).slice(0, 8);
const items = buildItems(candidates);
const digestUrl = `${SITE_URL}/blog/${POST_SLUG}`;

fs.writeFileSync(TECH_NEWS_FILE, JSON.stringify(items, null, 2));

const digestIndex = loadJson(DIGESTS_FILE, []);
const todayDigest = {
  slug: POST_SLUG,
  date: TODAY,
  titleZh: `${TODAY} AI 日报`,
  titleEn: `${TODAY} AI Daily Briefing`,
  excerptZh: items.length ? items[0].summaryZh : '今天没有筛到足够值得单独成文的 AI 条目。',
  excerptEn: items.length ? items[0].summaryEn : 'No strong AI items were selected today.',
  path: `/blog/${POST_SLUG}`,
  itemCount: items.length,
  heroTitleZh: items[0]?.titleZh || '',
  heroTitleEn: items[0]?.titleEn || '',
  featuredItems: items.slice(0, 3).map(item => ({ id: item.id, titleZh: item.titleZh, titleEn: item.titleEn, tag: item.tag })),
};
const mergedDigests = [todayDigest, ...digestIndex.filter(item => item.slug !== POST_SLUG)].sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync(DIGESTS_FILE, JSON.stringify(mergedDigests, null, 2));
fs.writeFileSync(POST_PATH, buildMarkdown(TODAY, items));
fs.writeFileSync(REPORT_FILE, buildReport(TODAY, digestUrl, items));

console.log(`[digest] wrote ${TECH_NEWS_FILE}`);
console.log(`[digest] wrote ${DIGESTS_FILE}`);
console.log(`[digest] wrote ${POST_PATH}`);
console.log(`[digest] wrote ${REPORT_FILE}`);
