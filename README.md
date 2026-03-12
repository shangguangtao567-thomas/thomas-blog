# Thomas's Blog — Static Edition

A minimal, fast personal blog powered by Vite + React + GitHub Pages.

## 内容结构

- `posts/`：正式博客文章与自动生成的 AI 日报文章
- `src/data/posts*.json`：由 `posts/` 构建出来的静态内容索引
- `src/data/tech-news.json`：当天 AI 日报的站内摘要卡片数据
- `src/data/ai-digests.json`：AI 日报归档索引
- `src/data/ai-digest-details.json`：AI 日报的结构化详情数据，用于专栏式详情页
- `src/data/ai-digest-report.txt`：更新完成后可直接发到 Discord 的文本汇报
- `src/data/ai-digest-report.json`：Discord 汇报与自动化所用的结构化状态文件
- `learning/`：轻量的一次性学习沉淀候选区（不替代现有 memory system）

## 日常写文章

1. 在 `posts/` 下新建 Markdown 文件：
   ```
   posts/YYYY-MM-DD-your-post-slug.md
   ```
2. 添加 frontmatter：
   ```markdown
   ---
   titleEn: "Your Post Title in English"
   titleZh: "你的文章标题"
   excerptEn: "Short summary"
   excerptZh: "中文摘要"
   tag: AI
   tagEn: AI
   readTime: 8
   date: 2026-03-05
   ---
   ```
3. 推到 `main`，GitHub Pages 会自动部署静态站点。

## AI 日报工作流

这个仓库现在的 AI 日报流程是：

1. `node scripts/fetch-ai-candidates.mjs`
   - 抓 RSS 候选、打分、去重。
   - 对高价值条目优先抓公开原文正文（本地确定性解析，不依赖付费摘要 API）。
   - 产出 `src/data/ai-candidates.json`，里面包含 body-fetch 元数据。
2. `node scripts/build-ai-digest.mjs`
   - **不调用外部摘要 API**。
   - 用本地脚本逻辑生成中英双语解释、主题归类、why-it-matters 和 issue metadata。
   - 产出：
     - 当天站内日报文章 `posts/YYYY-MM-DD-ai-daily-YYYY-MM-DD.md`
     - `src/data/tech-news.json`
     - `src/data/ai-digests.json`
     - `src/data/ai-digest-details.json`
     - `src/data/ai-digest-report.txt`
     - `src/data/ai-digest-report.json`
3. `pnpm build`
   - 重新构建静态站点。
4. `scripts/run-ai-rss-update.sh`
   - 适合放进 OpenClaw cron，拉取更新、生成日报、构建、commit、push。
   - 若设置 `DISCORD_WEBHOOK_URL`，会在成功发布后发送 Discord 成功汇报，并带上站点 digest URL。

## 关键环境变量

```bash
SITE_URL=https://guangtaos29545.github.io/thomas-blog
AI_DIGEST_WINDOW_HOURS=24
AI_DIGEST_MAX_ITEMS=6
AI_DIGEST_BODY_FETCH_LIMIT=5
DISCORD_WEBHOOK_URL=...
```

## 本地开发

```bash
pnpm install
pnpm dev
pnpm build
```

手动刷新 AI 日报：

```bash
node scripts/fetch-ai-candidates.mjs
node scripts/build-ai-digest.mjs
pnpm build
cat src/data/ai-digest-report.txt
```

生成一份 repo 内的学习沉淀候选：

```bash
node scripts/create-learning-deposit.mjs
```

发送 Discord 汇报（需要设置 webhook）：

```bash
pnpm send-discord-report
```

## 部署

- 定时更新：继续使用 OpenClaw cron 调 `scripts/run-ai-rss-update.sh`
- 站点部署：保留 GitHub Pages，通过 push 到 `main` 触发

## 额外交接

- 详细升级说明与后续 Codex 本地聊天安全接入建议：`docs/ai-digest-round-2-handoff.md`
