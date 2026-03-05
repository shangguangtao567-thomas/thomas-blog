/**
 * Export posts from the Manus project database to Markdown files.
 * Run once during migration: node scripts/export-posts.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'posts');

if (!fs.existsSync(postsDir)) {
  fs.mkdirSync(postsDir, { recursive: true });
}

// Posts exported from database (2026-03-05)
const posts = [
  {
    slug: 'open-source-models-agent-orchestration',
    titleZh: '2026 春节档 AI 大乱斗：Qwen3.5、MiniMax M2.5、GLM-5、Kimi K2.5 深度对比，以及我对 OpenClaw 层级价值的判断',
    titleEn: 'Spring 2026 Open-Source Model Showdown: Qwen3.5, MiniMax M2.5, GLM-5, Kimi K2.5 — And Why the Orchestration Layer Matters',
    excerptZh: '四个模型的技术路线各有侧重，但有一个共同方向：把工具调用和 Agent 能力放在比"聪明程度"更优先的位置。这背后，是 OpenClaw 这个层级正在崛起的价值。',
    excerptEn: 'Four models, four technical approaches, one shared direction: prioritizing tool-calling and agent capabilities over raw intelligence. Behind this trend lies the rising value of the orchestration layer.',
    tag: 'AI',
    tagEn: 'AI',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&auto=format&fit=crop&q=80',
    readTime: 18,
    publishedAt: '2026-03-03',
    contentEn: `In the week surrounding Chinese New Year 2026, China's AI scene put on a collective release show: Qwen3.5, MiniMax M2.5, GLM-5, and Kimi K2.5 all dropped within days of each other. I've been putting each of them through their paces, and the more I use them, the more I notice something interesting—their technical approaches differ, but they share a common direction: **prioritizing tool-calling and agent capabilities over raw intelligence**.

This post is my research notes on these four models, ending with a broader observation I've been sitting with.

---

## Qwen3.5: Native Multimodal Agent on a Hybrid Architecture

Alibaba's Qwen3.5 is the most architecturally adventurous of the bunch. The flagship Qwen3.5-397B-A17B uses a **hybrid architecture fusing linear attention (via Gated Delta Networks) with sparse mixture-of-experts (Sparse MoE)**—397B total parameters, but only 17B activated per forward pass. This achieves top-tier capability while dramatically reducing inference costs.

The language coverage expansion is also notable: from 119 languages in the previous generation to **201 languages and dialects**, which has real implications for global deployment.

**On tool calling**, Qwen3.5 performs impressively. It scores 72.9 on BFCL-V4 (tool use benchmark) and 46.1 on MCP-Mark (MCP protocol tool calling), both placing it in the top tier among open-source models. The hosted Qwen3.5-Plus comes with built-in official tools, adaptive tool selection, and a 1 million token context window.

The **small-scale versions** are equally interesting: Qwen3.5-9B outperforms OpenAI's gpt-oss-120B on multiple benchmarks while running on a standard laptop—a significant development for locally deployed agent frameworks.

| Capability | Performance |
|-----------|-------------|
| Architecture | Linear attention + Sparse MoE hybrid |
| Active parameters | 17B (of 397B total) |
| Tool calling | BFCL-V4: 72.9, MCP-Mark: 46.1 |
| Context window | 1M tokens (Plus version) |
| Language support | 201 languages and dialects |
| Open source | Yes (Qwen3.5-397B-A17B) |

---

## My Take: The Value of the OpenClaw Layer

After spending time with these models, I keep coming back to the same observation.

The current AI tool usage pattern looks roughly like this: you open Claude or ChatGPT, describe your need, wait for an answer, then go execute it yourself. The model is the "consultant," you are the "executor."

But tools like OpenClaw represent a different paradigm: **the model itself is the executor**. It doesn't just give you suggestions—it calls tools, runs commands, manages files, sends messages. You describe the goal; it completes the task.

There's a key cognitive shift here: **the execution-layer model doesn't need to be the smartest—it just needs to call tools accurately and orchestrate task flows correctly**.

*These are my thoughts from recent experimentation—not necessarily right, happy to discuss.*`,
    contentZh: `2026 年的春节档，中国 AI 圈上演了一场集体发布秀：Qwen3.5、MiniMax M2.5、GLM-5、Kimi K2.5 在短短一周内相继亮相。我把这几个模型都折腾了一遍，越用越觉得有意思——它们的技术路线各有侧重，但有一个共同的方向：**把工具调用和 Agent 能力放在了比"聪明程度"更优先的位置**。

这篇文章是我的调研笔记，最后会聊聊我从中得出的一个判断。

---

## 我的判断：OpenClaw 这个层级的价值

用了这几个模型一段时间之后，我有一个越来越强烈的感受。

现在的 AI 工具使用范式，大致是这样的：你打开 Claude 或 ChatGPT，描述你的需求，等它给你答案，然后你再去执行。模型是"顾问"，你是"执行者"。

但 OpenClaw 这类工具代表的是另一种范式：**模型本身就是执行者**。它不只是给你建议，而是直接调用工具、执行命令、管理文件、发送消息。你描述目标，它完成任务。

*以上是我最近折腾这几个模型的一些想法，不一定对，欢迎讨论。*`
  },
  {
    slug: 'openclaw-ultimate-setup-guide',
    titleZh: 'OpenClaw 终极安装指南：从零搭建你的私有 AI 助手',
    titleEn: 'The Ultimate OpenClaw Setup Guide: Build Your Private AI Assistant',
    excerptZh: '完整记录 OpenClaw 的安装配置流程，涵盖 Telegram、Discord 接入、技能扩展与常见问题排查，帮你少踩坑。',
    excerptEn: 'A complete walkthrough of OpenClaw installation and configuration, covering Telegram/Discord integration, skill extensions, and common troubleshooting.',
    tag: 'AI',
    tagEn: 'AI',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop&q=80',
    readTime: 15,
    publishedAt: '2026-03-03',
    contentEn: `OpenClaw (formerly known as Clawdbot) is an open-source project that lets you run a private AI assistant on your own computer. It integrates with WhatsApp, Telegram, Discord, Slack, and other major messaging platforms, supports executing local commands, remembers user preferences, and keeps all data local—nothing goes through third-party servers.

After spending some time getting it set up, I've compiled the complete installation and configuration process into this guide to help you avoid common pitfalls.

---

## Prerequisites

Before getting started, make sure you have the following:

### 1. Operating System

Supports macOS, Windows, and Linux—all three platforms work.

### 2. Node.js (Version 22 or Higher)

OpenClaw is built with JavaScript, so you need the Node.js runtime.

**Check if already installed:**

\`\`\`bash
node --version
\`\`\`

If you see something like \`v22.1.0\`, you're good. If you get "command not found" or a version below 22, you'll need to install it first.

### 3. AI Service Account

OpenClaw doesn't include an AI model—it connects to third-party AI services. Currently supported:

- **Anthropic (Claude)**: Recommended; Claude Opus 4.5 works great
- **OpenAI (ChatGPT)**: Also supported; works with GPT-4 series

---

## Step 1: Install OpenClaw

Open Terminal (macOS/Linux) or PowerShell (Windows) and run the installation command:

\`\`\`bash
curl -fsSL https://openclaw.ai/install.sh | bash
\`\`\`

Verify the installation afterward:

\`\`\`bash
openclaw --version
\`\`\`

---

## Wrapping Up

Overall, the OpenClaw installation process isn't particularly complex—most of the time is spent understanding the components and configuring messaging channels. Once it's running and connected to your daily Telegram or Discord, the experience is quite solid.

If you run into issues during installation, feel free to leave a comment below, or check the [official documentation](https://docs.openclaw.ai).`,
    contentZh: `OpenClaw（前身叫 Clawdbot）是一个让你在自己电脑上运行私有 AI 助手的开源项目。它可以接入 WhatsApp、Telegram、Discord、Slack 等主流消息平台，支持执行本地命令、记忆用户偏好，并且数据完全本地化——不经过任何第三方服务器。

折腾了一段时间之后，我把完整的安装和配置流程整理成了这篇笔记，希望能帮你少踩一些坑。

---

## 准备工作

在开始之前，需要确认以下几件事：

### 1. Node.js（版本 22 或更高）

OpenClaw 基于 JavaScript 构建，所以需要 Node.js 运行环境。

\`\`\`bash
node --version
\`\`\`

---

## 总结

整体来说，OpenClaw 的安装流程并不复杂，主要的时间花在理解各个组件的作用和配置消息渠道上。一旦跑起来，把它接入日常使用的 Telegram 或 Discord，体验还是相当不错的。`
  }
];

// Write each post as a Markdown file with frontmatter
posts.forEach(post => {
  const frontmatter = `---
slug: "${post.slug}"
titleZh: "${post.titleZh.replace(/"/g, '\\"')}"
titleEn: "${post.titleEn.replace(/"/g, '\\"')}"
excerptZh: "${post.excerptZh.replace(/"/g, '\\"')}"
excerptEn: "${post.excerptEn.replace(/"/g, '\\"')}"
tag: "${post.tag}"
tagEn: "${post.tagEn}"
image: "${post.image}"
readTime: ${post.readTime}
publishedAt: "${post.publishedAt}"
---

<!-- CONTENT_EN -->
${post.contentEn}

<!-- CONTENT_ZH -->
${post.contentZh}
`;

  const filePath = path.join(postsDir, `${post.publishedAt}-${post.slug}.md`);
  fs.writeFileSync(filePath, frontmatter, 'utf-8');
  console.log(`✓ Written: ${path.basename(filePath)}`);
});

console.log(`\n✅ Exported ${posts.length} posts to ${postsDir}`);
