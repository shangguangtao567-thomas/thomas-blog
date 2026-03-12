import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadSiteConfig } from './lib/site-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const X_DRAFTS_DIR = path.join(ROOT, 'x-drafts');
const DIGESTS_FILE = path.join(DATA_DIR, 'ai-digests.json');
const DIGEST_DETAILS_FILE = path.join(DATA_DIR, 'ai-digest-details.json');
const X_DRAFTS_DATA_FILE = path.join(DATA_DIR, 'x-drafts.json');
const siteConfig = loadSiteConfig();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function upsertBySlug(items, next) {
  return [next, ...items.filter(item => item.slug !== next.slug)].sort((a, b) => b.date.localeCompare(a.date));
}

function cleanInline(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function cleanBlock(text = '') {
  return String(text || '')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

ensureDir(X_DRAFTS_DIR);

const digestIndex = loadJson(DIGESTS_FILE, []);
const digestDetails = loadJson(DIGEST_DETAILS_FILE, []);
const latestDigest = digestDetails[0];

if (!latestDigest) {
  fs.writeFileSync(X_DRAFTS_DATA_FILE, JSON.stringify([], null, 2));
  console.log('[x-drafts] no digest detail found, wrote empty src/data/x-drafts.json');
  process.exit(0);
}

const topTheme = latestDigest.themes?.[0];
const secondTheme = latestDigest.themes?.[1];
const firstItem = latestDigest.featuredItems?.[0];
const secondItem = latestDigest.featuredItems?.[1];
const thirdItem = latestDigest.featuredItems?.[2];

const angleZh = cleanInline(
  latestDigest.issueSummaryZh ||
  `如果把今天的 AI 日报压成一句话，就是：${topTheme?.themeZh || 'AI 行业'} 正在从“演示能力”转向“接进真实流程”。`
);
const angleEn = cleanInline(
  latestDigest.issueSummaryEn ||
  `If you compress today's digest into one sentence, it is this: ${topTheme?.themeEn || 'AI'} is moving from isolated demos to workflow-grade execution.`
);

const hooksZh = [
  cleanInline(`今天最值得发到 X 的，不是 6 条新闻，而是 1 个判断：${angleZh}`),
  cleanInline(`${topTheme?.themeZh || 'AI 行业'} 这条主线，今天又被往前推了一截。`),
  cleanInline(`如果你只看今天一条 AI 结论，我会看这个：${firstItem?.titleZh || latestDigest.heroTitleZh}`),
];

const hooksEn = [
  cleanInline(`The real story today is not six AI updates. It is one market shift: ${angleEn}`),
  cleanInline(`${topTheme?.themeEn || 'The main AI trend'} moved another step forward today.`),
  cleanInline(`If I had to compress today's AI signal into one takeaway, I would start here: ${firstItem?.titleEn || latestDigest.heroTitleEn}`),
];

const shortPostZh = cleanBlock([
  hooksZh[0],
  '',
  firstItem?.whyItMattersZh || angleZh,
  secondTheme?.themeZh ? `另一条同时在加速的线是：${secondTheme.themeZh}。` : '',
  `完整日报：${latestDigest.digestUrl}`,
].filter(Boolean).join('\n'));

const shortPostEn = cleanBlock([
  hooksEn[0],
  '',
  firstItem?.whyItMattersEn || angleEn,
  secondTheme?.themeEn ? `The second line accelerating at the same time is ${secondTheme.themeEn}.` : '',
  `Full digest: ${latestDigest.digestUrl}`,
].filter(Boolean).join('\n'));

const threadZh = [
  hooksZh[0],
  angleZh,
  firstItem ? `1. ${firstItem.titleZh}\n${firstItem.whyItMattersZh || firstItem.summaryZh}` : '',
  secondItem ? `2. ${secondItem.titleZh}\n${secondItem.whyItMattersZh || secondItem.summaryZh}` : '',
  thirdItem ? `3. ${thirdItem.titleZh}\n${thirdItem.whyItMattersZh || thirdItem.summaryZh}` : '',
  `如果你想看完整证据链，我把今天的 digest 放这里：${latestDigest.digestUrl}`,
].filter(Boolean);

const threadEn = [
  hooksEn[0],
  angleEn,
  firstItem ? `1. ${firstItem.titleEn}\n${firstItem.whyItMattersEn || firstItem.summaryEn}` : '',
  secondItem ? `2. ${secondItem.titleEn}\n${secondItem.whyItMattersEn || secondItem.summaryEn}` : '',
  thirdItem ? `3. ${thirdItem.titleEn}\n${thirdItem.whyItMattersEn || thirdItem.summaryEn}` : '',
  `Full evidence chain: ${latestDigest.digestUrl}`,
].filter(Boolean);

const slug = `x-draft-${latestDigest.date}`;
const reviewPath = path.join('x-drafts', `${latestDigest.date}.md`);

const draftPack = {
  date: latestDigest.date,
  slug,
  digestSlug: latestDigest.slug,
  digestPath: latestDigest.path,
  angleZh,
  angleEn,
  hooksZh,
  hooksEn,
  shortPostZh,
  shortPostEn,
  threadZh,
  threadEn,
  ctaUrl: latestDigest.digestUrl,
  ctaLabelZh: '阅读完整日报',
  ctaLabelEn: 'Read the full digest',
  reviewPath,
};

const markdown = `# X Draft Pack | ${latestDigest.date}

Skill: [$x-idea-to-article](/Users/shangguangtao/.codex/skills/x-idea-to-article/SKILL.md)

## Angle
${angleZh}

## Evidence map
${(latestDigest.featuredItems || []).slice(0, 3).map((item, index) => `- ${index + 1}. ${item.titleZh}｜${item.whyItMattersZh || item.summaryZh}`).join('\n')}

## Hook options
${hooksZh.map((hook, index) => `${index + 1}. ${hook}`).join('\n')}

## Draft A
${threadZh.join('\n\n')}

## Draft B
${shortPostZh}

## Review question
这是一版中文审稿稿。如果要按 skill 流程继续，请先确认中文版本，再产出英文/X 版。

## Posting note
- 主 CTA：${siteConfig.xProfileUrl}
- 导流页：${latestDigest.digestUrl}
`;

fs.writeFileSync(path.join(ROOT, reviewPath), markdown);
const currentDrafts = loadJson(X_DRAFTS_DATA_FILE, []);
fs.writeFileSync(X_DRAFTS_DATA_FILE, JSON.stringify(upsertBySlug(currentDrafts, draftPack), null, 2));

console.log(`[x-drafts] wrote ${path.join(ROOT, reviewPath)}`);
console.log(`[x-drafts] wrote ${X_DRAFTS_DATA_FILE}`);
