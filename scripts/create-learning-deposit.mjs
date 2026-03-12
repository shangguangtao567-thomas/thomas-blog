import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadJson, parseArgs, ensureDir } from './lib/ai-digest/shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIGEST_DETAILS_FILE = path.join(ROOT, 'src', 'data', 'ai-digest-details.json');
const TEMPLATE_FILE = path.join(ROOT, 'learning', 'templates', 'digest-deposition-template.md');
const DEFAULT_OUT_DIR = path.join(ROOT, 'learning', 'inbox');

function renderTemplate(template, map) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => map[key] ?? '');
}

function bulletize(lines = []) {
  return lines.length ? lines.map(line => `- ${line}`).join('\n') : '- 待补充 / to be added';
}

function findDetail(details, slug) {
  if (slug) return details.find(item => item.slug === slug);
  return details[0];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const details = loadJson(DIGEST_DETAILS_FILE, []);
  const detail = findDetail(details, args.slug);

  if (!detail) {
    throw new Error('no digest detail available to build a learning deposit');
  }

  const template = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  const paraBucket = args.bucket || 'Resources';
  const highlights = detail.items.slice(0, 3);
  const outDir = args.out ? path.dirname(path.resolve(args.out)) : DEFAULT_OUT_DIR;
  ensureDir(outDir);

  const rendered = renderTemplate(template, {
    title: `${detail.date} AI digest learning deposit`,
    date: detail.date,
    digestUrl: detail.digestUrl,
    paraBucket,
    digestTitle: detail.titleEn,
    whyNow: detail.issueSummaryEn,
    themes: (detail.themes || []).slice(0, 3).map(theme => `${theme.themeEn} (${theme.count})`).join(', '),
    projectLinks: 'None yet — map manually after review.',
    areaLinks: 'AI digestion, local research workflow, bilingual publishing.',
    resourceTags: (detail.themes || []).slice(0, 3).map(theme => theme.themeEn).join(', '),
    durableLessons: bulletize(highlights.map(item => item.whyItMattersEn || item.summaryEn)),
    signals: bulletize(highlights.map(item => `${item.titleEn} — ${item.watchNextEn || item.summaryEn}`)),
    questions: bulletize(highlights.map(item => `What would make ${item.titleEn} durable enough to affect my own tooling or writing workflow?`)),
    postIdea: detail.items[0]?.titleEn ? `Write a short note connecting ${detail.items[0].titleEn} to a broader workflow trend.` : 'Turn the strongest item into a short post.',
    experimentIdea: 'Pick one workflow/tooling item and reproduce its value locally with a small script or note.',
    sourceReview: 'Read the top 1-2 original links again and extract implementation-level details into the real knowledge system.',
  });

  const outputPath = args.out
    ? path.resolve(args.out)
    : path.join(outDir, `${detail.date}-ai-digest-learning-deposit.md`);

  fs.writeFileSync(outputPath, rendered);
  console.log(`[learning] wrote ${path.relative(ROOT, outputPath)}`);
}

try {
  main();
} catch (error) {
  console.error('[learning] fatal:', error.message);
  process.exit(1);
}
