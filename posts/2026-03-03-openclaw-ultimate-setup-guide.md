---
slug: "openclaw-ultimate-setup-guide"
titleZh: "OpenClaw 终极安装指南：从零搭建你的私有 AI 助手"
titleEn: "OpenClaw Setup Guide: Build Your Private AI Assistant"
excerptZh: "完整记录 OpenClaw 的安装配置流程，涵盖 Telegram、Discord 接入、技能扩展与常见问题排查，帮你少踩坑。"
excerptEn: "A complete walkthrough of OpenClaw installation and configuration, covering Telegram/Discord integration, skill extensions, and common troubleshooting."
tag: "AI"
tagEn: "AI"
image: "/images/openclaw-ultimate-setup-guide.png"
readTime: 15
publishedAt: "2026-03-03"
---

<!-- CONTENT_EN -->
OpenClaw (formerly known as Clawdbot) is an open-source project that lets you run a private AI assistant on your own computer. It integrates with WhatsApp, Telegram, Discord, Slack, and other major messaging platforms, supports executing local commands, remembers user preferences, and keeps all data local—nothing goes through third-party servers.

After spending some time getting it set up, I've compiled the complete installation and configuration process into this guide to help you avoid common pitfalls.

---

## Prerequisites

Before getting started, make sure you have the following:

### 1. Operating System

Supports macOS, Windows, and Linux—all three platforms work.

### 2. Node.js (Version 22 or Higher)

OpenClaw is built with JavaScript, so you need the Node.js runtime.

**Check if already installed:**

```bash
node --version
```

If you see something like `v22.1.0`, you're good. If you get "command not found" or a version below 22, you'll need to install it first.

### 3. AI Service Account

OpenClaw doesn't include an AI model—it connects to third-party AI services. Currently supported:

- **Anthropic (Claude)**: Recommended; Claude Opus 4.5 works great
- **OpenAI (ChatGPT)**: Also supported; works with GPT-4 series

---

## Step 1: Install OpenClaw

Open Terminal (macOS/Linux) or PowerShell (Windows) and run the installation command:

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Verify the installation afterward:

```bash
openclaw --version
```

---

## Wrapping Up

Overall, the OpenClaw installation process isn't particularly complex—most of the time is spent understanding the components and configuring messaging channels. Once it's running and connected to your daily Telegram or Discord, the experience is quite solid.

If you run into issues during installation, feel free to leave a comment below, or check the [official documentation](https://docs.openclaw.ai).

<!-- CONTENT_ZH -->
OpenClaw（前身叫 Clawdbot）是一个让你在自己电脑上运行私有 AI 助手的开源项目。它可以接入 WhatsApp、Telegram、Discord、Slack 等主流消息平台，支持执行本地命令、记忆用户偏好，并且数据完全本地化——不经过任何第三方服务器。

折腾了一段时间之后，我把完整的安装和配置流程整理成了这篇笔记，希望能帮你少踩一些坑。

---

## 准备工作

在开始之前，需要确认以下几件事：

### 1. Node.js（版本 22 或更高）

OpenClaw 基于 JavaScript 构建，所以需要 Node.js 运行环境。

```bash
node --version
```

---

## 总结

整体来说，OpenClaw 的安装流程并不复杂，主要的时间花在理解各个组件的作用和配置消息渠道上。一旦跑起来，把它接入日常使用的 Telegram 或 Discord，体验还是相当不错的。
