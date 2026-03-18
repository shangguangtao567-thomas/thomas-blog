import path from 'path';
import { fileURLToPath } from 'url';
import { loadJson, parseArgs, trimText } from './lib/ai-digest/shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DETAILS_FILE = path.join(ROOT, 'src', 'data', 'ai-digest-details.json');

/**
 * Build rich Discord message from digest details.
 * Splits into multiple messages if content exceeds 2000 chars.
 */
function buildDiscordMessages(detail) {
  const messages = [];

  // Message 1: Header + intro + top 3 items
  let msg1 = `**AI 日报 | ${detail.date}**\n\n`;
  msg1 += trimText(detail.introZh || detail.issueSummaryZh || '', 500) + '\n\n';

  const items = detail.items || [];
  const topItems = items.slice(0, 3);

  for (const item of topItems) {
    msg1 += `**${item.rank}. ${item.briefTitleZh || item.titleZh}**\n`;
    msg1 += `${trimText(item.summaryZh || '', 200)}\n`;
    msg1 += `🔗 <${item.sourceUrl}>\n\n`;
  }

  if (items.length > 3) {
    msg1 += `_(更多内容见完整日报)_\n`;
  }
  msg1 += `📖 完整日报：<${detail.digestUrl}>`;

  messages.push(msg1);

  // Message 2: Remaining items + English lead
  if (items.length > 3) {
    let msg2 = '**📰 今日补充：**\n\n';
    const rest = items.slice(3);

    for (const item of rest) {
      msg2 += `**${item.rank}. ${item.briefTitleZh || item.titleZh}**\n`;
      msg2 += `${trimText(item.summaryZh || '', 200)}\n`;
      msg2 += `🔗 <${item.sourceUrl}>\n\n`;
    }

    // English lead if space
    const enLead = trimText(detail.introEn || detail.issueSummaryEn || '', 300);
    if (enLead && (msg2.length + enLead.length + 20) < 2000) {
      msg2 += `\n---\n\n*EN Lead: ${enLead}*`;
    }

    if (msg2.length > 2000) {
      // Truncate to fit
      msg2 = msg2.slice(0, 1950) + '\n\n_(内容过长，请查看完整日报)_';
    }

    messages.push(msg2);
  }

  // Split any message that still exceeds 2000 chars
  const final = [];
  for (const m of messages) {
    if (m.length <= 2000) {
      final.push(m);
    } else {
      // Split at double newline boundaries
      const chunks = m.split('\n\n');
      let current = '';
      for (const chunk of chunks) {
        if ((current + '\n\n' + chunk).length > 2000) {
          if (current) final.push(current);
          current = chunk;
        } else {
          current = current ? current + '\n\n' + chunk : chunk;
        }
      }
      if (current) final.push(current);
    }
  }

  return final;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || args.webhook;

  if (!webhookUrl) {
    console.log('[discord] DISCORD_WEBHOOK_URL not set, skip sending report');
    return;
  }

  const detail = loadJson(DETAILS_FILE, {});
  if (!detail?.digestUrl) {
    // Fallback: try report json
    const REPORT_FILE = path.join(ROOT, 'src', 'data', 'ai-digest-report.json');
    const report = loadJson(REPORT_FILE, {});
    if (!report?.digestUrl) {
      throw new Error('no digest data found');
    }
    // Send simple report as fallback
    const content = [report.messageZh, '', report.messageEn].filter(Boolean).join('\n\n').slice(0, 1900);
    await sendToDiscord(webhookUrl, content);
    return;
  }

  const messages = buildDiscordMessages(detail);
  console.log(`[discord] Sending ${messages.length} message(s)...`);

  for (const content of messages) {
    await sendToDiscord(webhookUrl, content);
  }

  console.log(`[discord] sent rich report for ${detail.digestUrl}`);
}

async function sendToDiscord(webhookUrl, content) {
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
}

main().catch(error => {
  console.error('[discord] fatal:', error.message);
  process.exit(1);
});
