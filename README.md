# Thomas's Blog — Daily Content Growth System

一个围绕 `X -> 网站承接 -> 订阅/复访沉淀` 设计的静态博客与日报系统。

## 内容层结构

- `posts/`
  - 手写长文
  - 自动生成的 AI 日报文章
- `x-drafts/`
  - 每天一份待审的 X 分发包 Markdown
- `src/data/posts*.json`
  - 由 `posts/` 构建出的静态文章索引与正文
- `src/data/ai-digests.json`
  - 日报归档索引
- `src/data/ai-digest-details.json`
  - 日报详情页所需的结构化数据
- `src/data/x-drafts.json`
  - 首页 / tech 页面使用的最新 X 草稿包索引
- `src/data/topics.json`
  - `topic/<slug>` 专题页数据
- `src/data/weekly-content-opportunities.json`
  - 最近 7 天值得扩成长文的 3 个主题建议
- `src/data/ai-digest-report.txt`
  - 日报发布后的文本汇报
- `src/data/ai-digest-report.json`
  - 自动化与 Discord 汇报的结构化状态文件

## Frontmatter

历史文章不需要补齐所有字段；缺失时会自动回退。

```yaml
---
titleEn: "Your Post Title in English"
titleZh: "你的文章标题"
seoTitleEn: "Optional SEO title"
seoTitleZh: "可选 SEO 标题"
excerptEn: "Short summary"
excerptZh: "中文摘要"
tag: AI
tagEn: AI
pillar: Agent Infra
pillarZh: Agent 基础设施
keywords: "agent infra, coding agent, open source"
featured: true
xHookEn: "Optional X hook"
xHookZh: "可选中文钩子"
readTime: 8
date: 2026-03-05
---
```

## 站点与增长配置

编辑根目录的 `site.config.json`：

```json
{
  "siteName": "Thomas's Blog",
  "siteUrl": "https://blog.lincept.com",
  "authorName": "Thomas",
  "xHandle": "@GuangtaoS29545",
  "xProfileUrl": "https://x.com/GuangtaoS29545",
  "buttondownUrl": "",
  "plausibleDomain": "",
  "primaryTopics": ["AI", "Tools", "Infrastructure", "Open Source"]
}
```

说明：

- `buttondownUrl`
  - 为空时，站内订阅入口会回退到 `feed.xml`
- `plausibleDomain`
  - 为空时不注入 Plausible
  - 配好后会自动启用首页 / 文章页 / digest 页的基础点击统计

## Daily Content Engine

### 1. 早上：生成日报并发布

```bash
scripts/run-ai-rss-update.sh
```

它会执行：

1. `node scripts/fetch-ai-candidates.mjs`
2. `node scripts/build-ai-digest.mjs`
3. `pnpm build`
4. 自动 commit / push
5. 若设置 `DISCORD_WEBHOOK_URL`，发送发布汇报

### 2. 中午：生成 X 分发包

```bash
scripts/run-midday-content-ops.sh
```

它会执行：

1. `node scripts/build-x-drafts.mjs`
2. `pnpm build`
3. 自动 commit / push

产物：

- `x-drafts/YYYY-MM-DD.md`
- `src/data/x-drafts.json`

X 草稿包遵循现有 [$x-idea-to-article](/Users/shangguangtao/.codex/skills/x-idea-to-article/SKILL.md) 工作流：

- 先中文审稿
- 再确认后产出英文 / X 版本

### 3. 每周一次：规划长文机会

```bash
scripts/run-weekly-content-planning.sh
```

它会执行：

1. `node scripts/build-weekly-content-opportunities.mjs`
2. 自动 commit / push

产物：

- `src/data/weekly-content-opportunities.json`

## 构建产物

`pnpm build` 现在会生成：

- `主页静态 HTML`
- `blog` 静态列表页
- `tech` 静态 digest hub
- `topic/<slug>/index.html`
- `blog/<slug>/index.html`
- `sitemap.xml`
- `robots.txt`
- `feed.xml`
- `Article / BlogPosting / CollectionPage / WebSite` JSON-LD

这样搜索引擎抓到的是带正文的真实 HTML，而不是空壳 SPA。

## 本地开发

```bash
pnpm install
pnpm dev
pnpm build
```

常用命令：

```bash
pnpm build-x-drafts
pnpm build-weekly-content-opportunities
```

## OpenClaw Cron 建议

推荐拆成三段：

- 早上固定时段：`scripts/run-ai-rss-update.sh`
- 中午固定时段：`scripts/run-midday-content-ops.sh`
- 每周一次：`scripts/run-weekly-content-planning.sh`

## 还需要你手动接入的东西

- Google Search Console
  - 提交 `sitemap.xml`
- Plausible
  - 建站点并把 `plausibleDomain` 写进 `site.config.json`
- Buttondown
  - 创建订阅页并把 `buttondownUrl` 写进 `site.config.json`

## 部署

- 继续使用 GitHub Pages
- push 到 `main` 后触发 `.github/workflows/deploy.yml`
