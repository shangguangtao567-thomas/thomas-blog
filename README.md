# Thomas's Blog — Static Edition

A minimal, fast personal blog powered by Vite + React + GitHub Pages.

## 内容结构

- `posts/`：正式博客文章与自动生成的 AI 日报文章
- `src/data/posts*.json`：由 `posts/` 构建出来的静态内容索引
- `src/data/tech-news.json`：当天 AI 日报的站内摘要卡片数据
- `src/data/ai-digests.json`：AI 日报归档索引
- `src/data/ai-digest-report.txt`：更新完成后可直接发到 Discord 的中文汇报

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
   - 只做 RSS 抓取、打分、去重，产出候选池。
2. `node scripts/build-ai-digest.mjs`
   - **不调用外部摘要 API**。
   - 用本地脚本逻辑把候选池整理成：
     - 当天站内日报文章 `posts/YYYY-MM-DD-ai-daily-YYYY-MM-DD.md`
     - `src/data/tech-news.json`
     - `src/data/ai-digests.json`
     - `src/data/ai-digest-report.txt`
3. `pnpm build`
   - 重新构建静态站点。
4. `scripts/run-ai-rss-update.sh`
   - 适合放进 OpenClaw cron，拉取更新、生成日报、构建、commit、push。

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

## 部署

- 定时更新：继续使用 OpenClaw cron 调 `scripts/run-ai-rss-update.sh`
- 站点部署：保留 GitHub Pages，通过 push 到 `main` 触发
