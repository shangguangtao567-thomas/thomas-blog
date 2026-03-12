import path from 'path';
import { fileURLToPath } from 'url';
import { loadJson, parseArgs } from './lib/ai-digest/shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const REPORT_JSON_FILE = path.join(ROOT, 'src', 'data', 'ai-digest-report.json');

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || args.webhook;

  if (!webhookUrl) {
    console.log('[discord] DISCORD_WEBHOOK_URL not set, skip sending report');
    return;
  }

  const report = loadJson(REPORT_JSON_FILE, {});
  if (!report?.digestUrl) {
    throw new Error('digest report json missing digestUrl');
  }

  const content = [report.messageZh, '', report.messageEn].filter(Boolean).join('\n\n').slice(0, 1900);
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'thomas-blog-ai-digest/2.0',
    },
    body: JSON.stringify({ content }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`discord webhook failed ${response.status}: ${body}`);
  }

  console.log(`[discord] sent success report for ${report.digestUrl}`);
}

main().catch(error => {
  console.error('[discord] fatal:', error.message);
  process.exit(1);
});
