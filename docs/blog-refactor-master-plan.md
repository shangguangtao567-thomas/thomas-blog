# Thomas Blog 全站重构总计划（内容冻结版）

更新日期：2026-04-20  
适用项目：`/Users/shangguangtao/projects/thomas-blog`

## 1. 目标

本计划的目标不是“继续修补现站”，而是在不改动任何既有网站内容的前提下，完成一次全站代码层、路由层、静态生成层、设计系统层和页面体验层的彻底重构。

本次重构必须同时达成以下结果：

- 保留所有既有文章、日报、图片、日期、slug、链接语义和内容文本不变。
- 消除当前“React 页面一套、`postbuild-static-routes.mjs` 再手写一套 HTML”的双实现架构。
- 形成单一可信的页面渲染链路、单一可信的 SEO 输出链路、单一可信的路由清单。
- 把首页、文章页、日报中心、归档页和 topic 页整理为一套一致、克制、可长期扩展的内容型设计系统。
- 在上线后让站点重新进入“可维护状态”，不再依赖 `.bak` 文件、孤儿组件和补丁式样式堆叠。

## 2. 范围

### 本次重构包含

- 前端框架与静态站点生成方案重组。
- 全站视觉体系、布局体系、组件体系重建。
- 首页、文章列表页、文章详情页、日报中心页、topic 页、404 页重做。
- SEO、JSON-LD、RSS、sitemap、canonical、Open Graph 输出链路重做。
- 主题切换、导航、订阅 CTA、分析埋点的统一接入。
- 现有构建脚本与新展示层之间的适配层设计。
- 代码目录结构、组件边界、数据加载边界、测试与验证机制重组。

### 本次重构不包含

- 修改任何 `posts/` 下的文章正文或 frontmatter 文案。
- 修改任何 `src/data/` 下的数据内容、排序、字段值。
- 修改任何文章或数据层引用到的图片路径字符串；但允许在相同文件路径下原位替换二进制图片资产，以完成品牌或视觉更新。
- 修改 `x-drafts/`、`learning/`、`site.config.json` 中的业务内容。
- 新增评论系统、账号体系、搜索后端、CMS、数据库。
- 借重构之机重写文章、重命名 slug、重排发布日期、清洗历史内容。

## 3. 当前状态盘点

### 3.1 内容与数据现状

基于当前仓库数据，站点至少包含以下内容资产：

- 文章总量：29
- 长文文章：9
- AI 日报文章：20
- 日报索引条目：20
- topic 索引：7
- `featured: true` 的长文数量：0

当前数据状态说明：

- 长文与日报共用 `/blog/:slug` 详情路由。
- 长文列表与首页主内容来自 `src/data/posts-index.json`。
- 详情页正文来自 `src/data/posts.json`。
- 日报中心来自 `src/data/ai-digests.json`。
- topic 数据已经存在于 `src/data/topics.json`，但前台并未真正启用。
- 日期格式并不统一，存在 ISO 时间串与 `YYYY-MM-DD` 并存的情况，后续必须在加载层归一化，不得回写源数据。

### 3.2 技术栈现状

- 构建器：Vite 6
- UI：React 19
- 路由：`wouter`
- 样式：Tailwind + 大型手写 `src/index.css` 混用
- 内容解析：`gray-matter`、`marked`
- 部署目标：静态产物 + GitHub Pages

### 3.3 当前公开路由与静态输出

当前前台已存在或已生成的关键输出如下：

| 类型 | 当前路径 | 说明 |
| --- | --- | --- |
| 页面 | `/` | 首页 |
| 页面 | `/blog` | 长文归档 |
| 页面 | `/blog/:slug` | 长文与日报详情共用 |
| 页面 | `/briefing` | 日报中心主入口 |
| 页面 | `/tech` | 与 `/briefing` 重复的别名入口 |
| 页面 | `/404.html` | 404 静态页 |
| 输出 | `/feed.xml` | RSS |
| 输出 | `/sitemap.xml` | sitemap |
| 输出 | `/robots.txt` | robots |
| 输出 | `/CNAME` | GitHub Pages 域名配置 |

### 3.4 当前架构问题

当前最严重的问题不是视觉陈旧，而是系统已经处于“半重构、半复制、半遗留”的状态：

- React 页面已经实现了一套首页、列表页、详情页。
- `scripts/postbuild-static-routes.mjs` 又手写了一套首页、列表页、详情页的静态 HTML 拼接逻辑。
- 这两套实现承担同一业务，但不存在单一真相源，后续任何 UI 修改都需要改两次。
- `TopicArchive.tsx`、`AIDigestBriefing.tsx`、`LanguageContext.tsx` 已存在，但未真正接入当前主路由。
- `ensurePlausible()`、`trackPageview()` 已实现，但当前主流程并未完整接通。
- `src/` 下存在多个 `.bak` 文件，说明历史重构未清场。
- 样式集中堆积在单个 `src/index.css`，同时混入 Tailwind 原子类与大块手写组件样式，边界不清。
- `/briefing` 与 `/tech` 实际承载同一信息架构，但当前被作为两个对等路由维护，SEO 与维护成本都不理想。
- topic 数据已经生成，但页面能力与静态产物未闭环，形成“有内容索引、无前台入口”的断层。

### 3.5 当前 UI 现状结论

当前站点并非不可用，但它更像一套已经上线的过渡稿：

- 首页、文章页、日报页的视觉语言接近，但不够系统化。
- 报道型内容、归档型内容、详情型内容没有建立稳定的版式原则。
- 英文 UI 已经是当前公开主体验，中文字段更多处于数据储备状态。
- 日报详情的结构化数据能力已经存在，但真实页面仍主要以通用文章页呈现，信息密度没有被有效利用。

结论：必须以“单次完整重构”处理，不能再沿用局部补丁。

### 3.6 实现状态快照（2026-04-20）

下面这份状态只描述当前仓库里已经真实落地的东西。当前本地内容/路由/截图/站内链接/阅读路径/Lighthouse 门禁已经接通并通过；deploy workflow 也已经改成上传前执行 `validate:ci`、发布后执行 `validate:parity`。但 latest `docs/baselines/live-parity-report.json` 仍显示 `errorCount: 35`，说明 production 站点还在服务旧版本产物，而不是当前仓库的最新输出；此外 HTML / JS / CSS 体积预算、INP 和更深的跨 topic 阅读链仍未完成。

| 领域 | 当前实现 | 状态 |
| --- | --- | --- |
| 展示层与路由 | Astro 已接管 `/`、`/blog`、`/briefing`、`/tech`、`/topic/:slug`、`/404.html`；`feed.xml`、`sitemap.xml`、`robots.txt`、`CNAME` 已能输出，曾缺失的 `/blog/ai-daily-2026-03-31/` 也已恢复到构建产物 | 已完成 |
| 内容适配与规范化 | `src/content/routes.ts`、`loaders.ts`、`normalize.ts`、`seo.ts` 已形成运行时单一来源；长文/日报双模板、hero 去重、日报签名清理已接入 | 已完成 |
| 主题切换与基础 chrome | 顶栏、页脚、站点导航、主题切换、`Skip to main content` skip link 与统一 focus ring 已接入 | 已完成 |
| `/tech` 兼容页 | 最小静态兼容页、canonical 到 `/briefing/`、`noindex,follow`、`meta refresh` 已落地 | 已完成 |
| Newsletter / analytics | `SubscribeCTA` 已接入页脚、日报页和文章页侧栏；Plausible 仅在 `hasPlausible` 为真时加载 | 已完成 |
| Baseline manifests | `baseline-content-manifest.json`、`baseline-route-manifest.json`、`baseline-fixture-matrix.json` 已生成在 `docs/baselines/` 下并可重建 | 已完成 |
| Fixture screenshots | 桌面/移动截图 baseline、current、diff 工件与 manifest 已生成；`capture/compare` 已做确定性处理，latest `screenshot-diff-report.json` 为 `diffs: []`、`missing: []` | 已完成 |
| Link crawl & reading-path reports | `validate-built-links.mjs` 与 `validate-reading-paths.mjs` 已接入；latest `link-crawl-report.json` 为 43 个种子路由、0 错误，`reading-path-report.json` 为 9 篇 essay 且无 orphan / thin / desk fallback 缺口 | 已完成 |
| Lighthouse baselines & gates | `lighthouse:baseline` / `lighthouse:validate` 已接入；`docs/baselines/lighthouse/` 下已生成 baseline/current/validate 工件，latest pass 覆盖 5 个 fixture × 2 个 profile，CLS 当前均为 0 | 已完成 |
| Build & validators | `baseline:generate`、`build`、`validate`（content/output/links/reading-paths）、`validate:ci`、`validate:parity`、`screenshot:capture`、`screenshot:compare`、`lighthouse:baseline`、`lighthouse:validate` 已形成当前校验入口；其中 `validate:ci = validate + screenshot:compare` | 已完成 |
| GitHub Pages deploy / parity | `.github/workflows/deploy.yml` 已改为上传前执行 `pnpm build` + `pnpm validate:ci`，发布后执行 `pnpm validate:parity`；README 也已同步 `/briefing/` canonical、`/tech/` compat 与 live parity 验证说明 | 已完成 |
| Live production parity | latest `docs/baselines/live-parity-report.json` 已产出，覆盖首页、`/briefing/`、`/tech/`、`404`、代表性详情页、lead topic 与 `/_astro` 资源；当前报告为 `errorCount: 35`，表明 live 站点仍是旧版本，存在明显 production drift | 部分完成 |
| Reading-chain UX | 首页、归档页、topic 页、文章侧链与 subscribe CTA 已连通；日报邻接已修正为真实连续 issue，topic 页已按 newest-first 组织并清理 range copy，reading-path validator 也已接通，但跨 topic 的继续阅读深度仍偏薄 | 部分完成 |

## 4. 不可谈判的不变量

以下约束不允许破坏，任何实现方案都必须满足：

1. `posts/`、`src/data/`、`x-drafts/`、`learning/` 内的业务内容视为冻结输入；`public/images/` 的路径与引用关系冻结，但二进制文件允许原位替换。
2. 所有既有文章与日报的 slug 必须 100% 保留。
3. 所有既有文章标题、摘要、正文、发布日期、图片路径字符串、关键词必须保持不变。
4. 所有既有已公开 URL 必须继续可访问，至少包括 `/`、`/blog`、`/briefing`、`/tech`、全部 `/blog/:slug`。
5. `/feed.xml`、`/sitemap.xml`、`/robots.txt`、`/CNAME` 必须继续产出。
6. 任何正文规范化逻辑只能做“显示层去重”，不能改写源内容。当前已存在的规则如“去掉重复 H1”“日报签名尾注清理”“正文已有同图时不重复渲染 hero 图”，必须保留语义。
7. 不能上线新旧两套页面长期并存的混合状态。灰度只能存在于开发或预发，不允许生产长期双轨。
8. 不能为了迁移方便重命名 `/briefing`、删除 `/tech`、或重排文章 URL 结构。
9. 最终交付时，前台仓库内不得残留 `.bak` 备份文件、未接线页面、重复模板实现。

### 4.1 内容一致性的判定对象

为避免“内容不变”被误解为渲染 HTML 完全逐字一致，内容一致性拆成两层：

- `源内容一致性`
  - 比较对象是冻结输入本身，而不是最终 HTML。
  - 长文以 `posts/` 原文和 `src/data/posts.json` 中的 `slug / title / excerpt / publishedAt / readTime / image / contentEn` 为真相源。
  - 日报以 `src/data/posts.json`、`src/data/ai-digests.json`、`src/data/ai-digest-details.json` 中对应字段为真相源。
  - 以上字段以稳定序列化后的 `SHA-256` 校验为准。
- `渲染结果一致性`
  - 比较对象是“允许白名单规范化后的可见语义内容”，用于防止渲染层把正文打坏。
  - 不要求 HTML byte-for-byte 一致，但要求正文段落、标题层级、链接、图片、代码块、列表、引用、表格语义完整。

### 4.2 显示层规范化白名单

只有以下三类显示层规范化允许存在，且必须在验证脚本中单独列出：

- 去掉与页面标题等价的正文首个重复 H1
- 去掉既有日报尾部固定签名尾注
- 当正文已包含与 hero 相同图片 URL 时，不重复渲染 hero 图

除以上白名单外，任何导致正文可见内容变化的处理一律视为内容漂移。

## 5. 设计论题

### 5.1 核心设计命题

新站不是“发光的 AI SaaS 官网”，而是“面向长期阅读的技术编辑台”。

它必须同时成立三件事：

- 像编辑部一样有秩序，读者一眼知道先看什么、后看什么。
- 像研究笔记一样有密度，读者能快速建立上下文而不是只看到营销标题。
- 像个人站一样有作者人格，但不依赖花哨视觉噱头。

### 5.2 视觉方向

- 默认体验以阅读优先为先，不以深色霓虹为先。
- 版式基调采用“编辑型留白 + 高信息密度副栏 + 节制动效”。
- 字体策略明确区分三层：正文阅读字体、界面字体、元信息等宽字体。
- 配色应从当前紫色科技感转向更稳重的“报刊/研究室”方向。
- 动效只承担层级进入与状态反馈，不允许出现装饰性漂浮、无意义渐变噪音主导注意力。

### 5.3 建议的设计令牌

以下是建议方向，不要求逐字照搬，但方向不可偏：

- 正文：`Source Serif 4` 或 `Newsreader`
- UI：`IBM Plex Sans` 或 `Manrope`
- Mono：`JetBrains Mono`
- 主色：深墨蓝 / 石墨灰
- 辅色：琥珀 / 冷灰蓝
- 背景：暖白纸面为主，深色模式作为完整但次要方案

## 6. 反目标

以下事情明确禁止作为本次重构目标：

- 禁止把博客改造成“卡片堆叠式通用模板站”。
- 禁止为了看起来现代而引入大量客户端状态管理。
- 禁止把日报页做成资讯门户式噪音瀑布流。
- 禁止把文章详情页做成营销落地页。
- 禁止恢复半成品的双语切换能力。当前公开体验以英文为主，本轮不做多语言产品化。
- 禁止为了“快上线”保留旧 React 路由与新静态页面双份模板。
- 禁止把构建脚本、渲染脚本、SEO 输出继续散落在多个不一致入口里。

## 7. 目标终态

重构完成后，站点应达到以下终态：

- 展示层迁移为静态优先框架，建议采用 Astro 作为新的页面与 SSG 主体。
- React 只保留在确有必要的交互岛上，例如主题切换等极小交互。
- 所有公开页面由同一套路由与组件系统渲染，不再存在“应用页一份、postbuild 再拼一份 HTML”的重复实现。
- 所有 SEO 输出由统一的 route manifest 生成，包括 canonical、OG、JSON-LD、RSS、sitemap。
- `/briefing` 成为日报中心唯一 canonical；`/tech` 保留兼容入口，但不再拥有独立信息架构。
- `topic` 页面正式启用，并由既有 `topics.json` 驱动，不改动内容源。
- 文章详情页区分“长文模板”和“日报模板”，但共享统一的阅读骨架与 SEO 规则。
- 页面大部分内容以 0 或接近 0 客户端 JavaScript 呈现。
- 样式体系拆分为设计令牌、基础样式、组件样式三层，不再由单一巨大 `index.css` 承担全部职责。
- 发布产物依然可部署到 GitHub Pages，不引入服务端依赖。

## 8. 逐路由 UX 方案

### 8.1 `/`

| 项目 | 方案 |
| --- | --- |
| 角色 | 站点总入口，负责建立作者定位并把流量分发到长文与日报 |
| 首屏 | 1 篇最新长文主视觉 + 站点论题 + 明确双 CTA（继续阅读 / 进入日报） |
| 第二屏 | 6 篇以内长文列表，强调标题、摘要、日期、阅读时长 |
| 第三屏 | 最近 3 期日报卡片，突出日期、主题线、item 数量 |
| 补充区 | topic 导航区，展示现有 7 个 topic 中最重要的 4 到 6 个 |
| 底部 | 简洁订阅/关注区，不做大面积营销横幅 |
| 强约束 | 首屏不得同时出现两个大 hero；不得让日报与长文争夺同等注意力 |

当前实现状态：

- 已完成：首屏长文、长文列表、日报卡片和 topic 区块已经落地。
- 已完成：页脚和内容页的 subscribe CTA 已接入；follow / RSS 的基础出口已存在。
- 部分完成：首页首屏还没有独立的 in-body subscribe 模块，阅读链仍可再强化。

首页的主编排原则：

- 当 `featured` 为空时，默认以最新非日报长文作为头条。
- 不改写现有标题与摘要，只改变呈现方式。
- 移动端按“头条长文 -> 长文列表 -> 日报 -> topic -> 订阅”顺序单列堆叠。

### 8.2 `/blog`

| 项目 | 方案 |
| --- | --- |
| 角色 | 长文归档总页 |
| 顶部 | 明确说明这是 essays / reviews / explainers 的归档，而不是日报列表 |
| 主体 | 1 篇 lead story + 时间顺序列表 |
| 筛选 | 仅允许基于现有 topic/tag 的前端筛选，不引入搜索后端 |
| 元信息 | 日期、阅读时长、topic、kind 一律使用统一元信息行 |
| 强约束 | 不允许混入日报卡片；不允许出现两种不同列表密度并存 |

当前实现状态：

- 已完成：lead story + chronological list + topic tag/chip 已接入。
- 部分完成：继续阅读链路只有基础 topic 跳转，相关内容推荐仍偏薄。

### 8.3 `/briefing`

| 项目 | 方案 |
| --- | --- |
| 角色 | 日报中心主入口 |
| 顶部 | 最新一期主区块，展示标题、摘要、主题线、条目数 |
| 次级区 | 最近 3 期日报卡片 |
| 归档区 | 历史日报时间线列表 |
| 辅助区 | “如何阅读日报”的短说明 + 订阅/关注 CTA |
| 强约束 | 不能做成信息门户；每屏必须有明显主次；摘要必须保持可扫读 |

当前实现状态：

- 已完成：最新一期、最近 3 期、历史归档的三段式结构已经落地。
- 已完成：subscribe CTA 已接入页面底部，follow / RSS 出口已可用。
- 部分完成：“如何阅读日报”的显式说明块仍可再加强。

### 8.4 `/tech`

| 项目 | 方案 |
| --- | --- |
| 角色 | 向旧链接、外部引用、历史分享兼容的别名入口 |
| SEO | `rel=canonical` 指向 `/briefing/`，同时加 `meta robots="noindex,follow"` |
| 行为 | 只输出一个最小静态兼容页；`<head>` 内使用 `meta refresh` 0 秒跳转到 `/briefing/`；`<body>` 内保留可见说明与手动链接；不得依赖 JS redirect |
| UI | 不维护独立视觉，不维护独立文案，不允许继续双份页面演化，不得渲染完整日报列表副本 |

当前实现状态：已完成。`/tech` 现在是最小兼容页，不再复制 `/briefing` 的完整信息架构。

### 8.5 `/blog/:slug` 长文详情

| 项目 | 方案 |
| --- | --- |
| 角色 | 深度阅读页 |
| 顶部 | 回退导航、topic/kind、日期、阅读时长、标题、摘要 |
| 主体 | 60 到 72 字符阅读栏宽；正文优先；图片与代码块样式统一 |
| 侧向信息 | 桌面端可显示当前 topic 与相关文章入口；移动端下沉到底部 |
| CTA | 仅保留轻量 follow / RSS 订阅，不做强销售式模块 |
| 强约束 | 正文区域不得被过多边栏打断；正文标题不得重复出现两次 |

当前实现状态：

- 已完成：长文模板、日报模板、hero 去重、日报 fallback 已接入。
- 已完成：同 topic 线程的起点/前后文/归档导读已接入阅读侧栏。
- 已完成：subscribe CTA 已接入侧栏。
- 部分完成：阅读侧栏已具备 thread continuation，但跨 topic 的相关推荐和 follow 链路还不够强。

补充规则：

- 若正文已包含与 hero 相同的图片，不重复渲染 hero 图。
- 若 markdown 首行 H1 与文章标题等价，只在页面头部保留一次。

### 8.6 `/blog/:slug` 日报详情

| 项目 | 方案 |
| --- | --- |
| 角色 | 结构化日报阅读页 |
| 数据源 | 优先读取 `ai-digest-details.json`；缺失时回退到 markdown 文章体 |
| 顶部 | 标题、日期、摘要、主题线、条目数、阅读说明 |
| 主体 | 每个条目保持统一卡片/段落结构：发生了什么、为什么重要、相关链接 |
| 侧栏 | 往期日报、今日 X draft 线索、关键主题 |
| 强约束 | 不能继续拿通用文章模板硬套所有日报；也不能脱离现有数据字段另造内容 |

当前实现状态：

- 已完成：结构化日报详情和 markdown fallback 共用同一骨架。
- 已完成：日报侧栏的 adjacent issues 已改为真实连续的前后期，不再跳过中间 issue。
- 已完成：subscribe CTA 已接入内容页。
- 部分完成：侧栏与阅读链仍偏基础，X draft 线索和关键主题尚未形成更强的页面级导航。

### 8.7 `/topic/:slug`

| 项目 | 方案 |
| --- | --- |
| 角色 | 内容聚类页，承接站内继续阅读 |
| 数据源 | 直接使用现有 `topics.json` 与 `posts-index.json` |
| 顶部 | topic 名称、文章数、topic 说明文案模板 |
| 主体 | 该 topic 下全部长文按时间倒序列出 |
| 跳转 | 首页、文章详情、归档页中的 topic tag 都应可进入 |
| 强约束 | 不允许引入新增人工文案维护负担；topic 说明必须模板化生成 |

当前实现状态：已完成静态页面和基础归档链路；列表已按 newest-first 排序，range copy 也已清理得更直接，但说明文案仍是模板化占位，尚未做更强的主题叙事层。

### 8.8 `404`

| 项目 | 方案 |
| --- | --- |
| 角色 | 明确的错误出口页 |
| 内容 | 简短说明 + 三个明确出口：首页、长文归档、日报中心 |
| 强约束 | 不允许空白 404；不允许只有一个“返回首页”链接 |

当前实现状态：已完成。

## 9. 系统设计方案

### 9.1 总体决策

本计划建议将展示层迁移到 Astro，原因如下：

- 当前站点本质是内容型静态站，Astro 的静态优先模型天然匹配。
- Astro 可以直接输出完整 HTML，替代当前 `postbuild-static-routes.mjs` 的手写 HTML 拼接。
- 文章详情、归档页、topic 页、SEO 输出都可以通过文件路由与构建期数据加载统一管理。
- 需要交互的部分极少，React 可以退居到小型 island，而不是继续承担整站渲染主干。

### 9.2 数据输入分层

重构后必须把数据读取分为三层：

1. 冻结输入层  
   直接读取现有 `posts/` 与 `src/data/*.json`，不改内容。

2. 适配层  
   负责把原始字段整理为统一的页面契约，例如：
   - `loadPosts()`
   - `loadPostBySlug(slug)`
   - `loadDigestIndex()`
   - `loadDigestDetail(slug)`
   - `loadTopics()`
   - `normalizePublishedAt()`
   - `deriveCanonicalPath()`
   - `shouldRenderHeroImage()`

3. 展示层  
   页面和组件只消费适配后的契约，不允许直接 `import ../data/*.json`。

### 9.3 路由与 SEO 统一

必须建立单一 route manifest，至少承载以下信息：

- 路径
- 路由类型
- canonical URL
- 页面标题
- 页面描述
- OG 信息
- JSON-LD 类型
- 发布时间
- 最后更新时间
- 是否进入 sitemap
- 是否进入 RSS

所有下列输出必须从同一 manifest 导出：

- 页面头部 meta
- canonical
- Open Graph
- Twitter Card
- JSON-LD
- sitemap
- RSS

禁止再出现“页面一个标题、RSS 一个标题、sitemap 一套来源、postbuild 再拼一套”的分裂状态。

### 9.4 日报详情渲染策略

日报详情必须采用双通道但单模板族策略：

- 若 `ai-digest-details.json` 中存在结构化详情，则以结构化模板渲染。
- 若不存在，则回退到 markdown 正文模板。
- 两种路径共用相同的页面骨架、相同的 SEO 工具、相同的 CTA 组件。

### 9.5 部署与兼容

- 继续输出纯静态站点，保留 GitHub Pages 部署模式。
- `/tech` 作为兼容路由保留，但只做兼容，不再做并行产品入口。
- RSS、sitemap、404、robots、CNAME 全部纳入新构建产物，而不是后置脚本打补丁。

## 10. 代码架构方案

### 10.1 目标目录形态

建议重构为如下结构：

```text
src/
  content/
    contracts.ts
    loaders.ts
    selectors.ts
    normalize.ts
  components/
    chrome/
    cards/
    article/
    briefing/
    topic/
    growth/
  layouts/
    SiteLayout.astro
    CollectionLayout.astro
    ArticleLayout.astro
  pages/
    index.astro
    blog/index.astro
    blog/[slug].astro
    briefing/index.astro
    tech/index.astro
    topic/[slug].astro
    404.astro
  styles/
    tokens.css
    base.css
    typography.css
    utilities.css
```

### 10.2 代码边界原则

- 页面组件不得直接读取原始 JSON。
- SEO 逻辑不得散落在各页面手写。
- 日期格式化、URL 归一化、正文首屏规范化必须收口在 `content/normalize.ts`。
- 卡片组件、元信息组件、CTA 组件必须可复用，不允许为首页和归档页分别复制一份。
- 不允许继续使用单个巨型全局样式文件承载全部页面实现。
- 不允许保留未接线组件进入主分支。

### 10.3 样式组织原则

- 全局只保留 design tokens、reset、typography、少量 layout utilities。
- 页面与组件样式按组件归属拆分。
- 不再混用“大量 Tailwind 原子类 + 大量全局类名 + 行内 style”三种体系。
- 行内样式只允许用于少数运行时动态值，不允许承担结构布局。

### 10.4 交互与 hydration 原则

- 默认页面应为纯静态 HTML。
- 只有主题切换、必要的归档筛选等极少交互允许 hydration。
- 文章详情页正文区域不得因为无关交互而整体 hydration。
- 首页、归档页、详情页必须以“无 JavaScript 仍可完成阅读与导航”为基本要求。

## 11. 分阶段执行方案

执行顺序必须严格遵守；任何阶段未通过退出门槛，不得进入下一阶段。

当前仓库状态说明：

- 主展示层、路由、SEO 和内容适配的骨架已经落地。
- subscribe CTA 和 Plausible gating 已经接入。
- baseline 文件、截图 baseline/current/diff 工件、内容/静态输出 validator、内链爬检、reading-path report 和 Lighthouse baseline/current/validate 工件已经接入。
- 缺失的 `/blog/ai-daily-2026-03-31/` 已补齐；digest adjacency 与 topic newest-first/range copy 也已修正。
- skip link、focus ring 与 layout-stability 改进已经落地；截图回归链路也已做确定性 capture/compare 处理。
- `README.md` 已更新：`/briefing/` 是 canonical digest archive，`/tech/` 仅作为兼容入口，并补充了 `validate:parity` 与部署说明。
- `.github/workflows/deploy.yml` 现在会在上传前执行 `pnpm build` + `pnpm validate:ci`，在 GitHub Pages 发布后执行 `pnpm validate:parity`。
- latest `docs/baselines/live-parity-report.json` 为 `errorCount: 35`，说明 production 仍在服务旧版本页面；当前问题不是“还没校验”，而是“已经校验且 live 仍未追平仓库产物”。
- 第 0 阶段里的路由/内容/截图/Lighthouse 基线已补齐，但 HTML / JS / CSS 体积基线仍未记录。
- 第 5、6、7 阶段里要求的 GitHub Pages live 一致性、INP / bundle-size 门禁和最终清场验收仍未全部补齐。

### 阶段 0：冻结基线

目标：先把当前站点的真实边界锁死。

工作项：

- 导出当前全部公开路由清单。
- 对 29 个 `/blog/:slug` 生成内容校验快照。
- 生成 `baseline-content-manifest.json`，至少包含每个 slug 的关键字段哈希与来源文件路径。
- 生成 `baseline-route-manifest.json`，记录全部现有公开 URL、canonical、OG、JSON-LD 存在性。
- 生成 `baseline-fixture-matrix.json`，至少覆盖以下页面类型：
  - 首页
  - 长文归档页
  - 日报中心页
  - `/tech` 兼容页
  - 404
  - 含 hero 图的长文详情
  - 含代码块的长文详情
  - 含列表/引用/表格的长文详情
  - 使用 `ai-digest-details.json` 渲染的日报详情
  - 使用 markdown fallback 渲染的日报详情
  - 含重复 H1 或日报签名尾注清理场景的边界详情页
- 对 `fixture matrix` 中全部页面生成桌面和移动端截图基线。
- 记录当前 Lighthouse、HTML 体积、JS 体积、CSS 体积。

退出门槛：

- 有完整路由基线。
- 有内容哈希基线。
- 有 fixture matrix 基线。
- 有视觉截图基线。

### 阶段 1：新展示层骨架

目标：搭起 Astro 主骨架与内容适配层，但不改变内容。

工作项：

- 初始化新的页面路由骨架。
- 建立 `content/loaders` 与 `content/normalize`。
- 建立统一 SEO 工具和 route manifest。
- 建立设计令牌、基础版式、主题切换承载层。

退出门槛：

- 新框架能基于冻结输入生成非空语义页面，至少覆盖 `/`、`/blog`、`/briefing`、`/tech`、任一长文详情、任一日报详情、任一 topic 页、`404`。
- 上述页面全部由同一套路由清单与 metadata 工具生成，不再依赖旧 React 页面作为真相源。

### 阶段 2：全局 chrome 与设计系统

目标：先完成导航、页脚、版心、排版、颜色、动效体系。

工作项：

- 重做 header、footer、brand、meta line、CTA 按钮、topic chip、article prose。
- 完成桌面/平板/移动三级响应式规范。
- 完成 light/dark 两套令牌，但以 light 为主阅读基线。

退出门槛：

- 在 `390px` 与 `1440px` 下，首页、长文详情、日报详情三类页面无横向溢出。
- header / footer / page shell / meta line / button / topic chip / prose 基础样式均已由新系统接管。

### 阶段 3：集合页迁移

目标：完成 `/`、`/blog`、`/briefing`、`/tech`。

工作项：

- 首页信息架构落地。
- 长文归档页与日报中心页落地。
- `/tech` 兼容策略落地。
- topic 入口在首页与归档页接通。

退出门槛：

- 四个集合页全部由新系统生成。
- 集合页不再存在双模板实现。

### 阶段 4：详情页迁移

目标：完成 `/blog/:slug` 的长文模板与日报模板。

工作项：

- 长文详情模板落地。
- 日报详情模板落地。
- 结构化日报与 markdown 回退双通道打通。
- 正文规范化规则统一到适配层。

退出门槛：

- 29 个详情页全部通过 `baseline-content-manifest.json` 的源内容一致性校验。
- `fixture matrix` 中所有详情页全部通过渲染结果一致性校验。
- 正文无重复标题、无重复 hero 图，且代码块、表格、图片、列表、引用均通过截图回归。

### 阶段 5：topic 与增长闭环

目标：让既有 topic 数据真正发挥作用。

工作项：

- `/topic/:slug` 全量静态生成。
- 首页、文章页、归档页 topic 跳转打通。
- 订阅、RSS、X 跳转与埋点统一接入。

退出门槛：

- 7 个 topic 路由全部生成。
- topic 到文章、文章到 topic 的双向链路成立。

### 阶段 6：SEO 与构建链路收口

目标：彻底删除旧的重复静态拼接逻辑。

工作项：

- 用新 route manifest 统一导出 canonical、JSON-LD、RSS、sitemap。
- 移除 `postbuild-static-routes.mjs` 对页面 HTML 的业务拼接职责。
- 清理旧 React 页面实现、孤儿上下文、`.bak` 文件。

退出门槛：

- 页面、SEO、feed、sitemap 全部由同一套构建链路产出。
- 旧双实现彻底消失。

### 阶段 7：回归、压测、上线

目标：在上线前完成最后验收。

工作项：

- 路由可用性检查。
- Lighthouse 与可访问性检查。
- 屏幕截图 diff。
- 生产构建与 GitHub Pages 预览验证。

退出门槛：

- 所有验收指标达标。
- 无 P1 / P2 级阻塞问题。

## 12. 风险

| 风险 | 影响 | 缓解方式 |
| --- | --- | --- |
| 内容漂移 | 文章或日报正文在迁移中被意外改写 | 为每个 slug 生成正文哈希与标题哈希，构建后自动比对 |
| URL 回归 | 外部链接失效、搜索收录受损 | 先冻结完整路由清单，再以 manifest 对照验证 |
| `/tech` 兼容处理不当 | 历史分享链路损坏或 SEO 重复 | 只允许最小静态兼容页：`canonical + noindex,follow + meta refresh + 手动链接`，禁止复制完整 briefing 页面 |
| 日报详情回退异常 | 有结构化数据的日报和无结构化数据的日报表现不一致 | 明确双通道统一骨架，增加回退测试样例 |
| 样式重构过度 | 阅读性下降，代码块/图片/表格显示异常 | 对长文、日报、含图文章、含代码文章分别做截图基线 |
| 迁移半途停住 | 生产上长期保留新旧双轨 | 分阶段 gate，未达门槛不得切换生产入口 |
| GitHub Pages 产物差异 | 本地正常、线上异常 | 预发环境必须使用与生产一致的静态托管验证 |

## 13. 验证器清单

以下清单必须在每个关键阶段执行；这是硬门槛，不是建议项。

除专门写明 live parity 的条目外，下面的完成态默认指向当前仓库的本地 build / preview 产物与 `docs/baselines/` 工件，不等同于 production 已经同步到同一版本。

### 13.1 测量协议

当前已自动化的量化协议如下；未自动化的项目必须明确标成缺口，不能口头视为已覆盖：

- 基线生成：`pnpm baseline:generate` 产出 `baseline-content-manifest.json`、`baseline-route-manifest.json`、`baseline-fixture-matrix.json`
- 功能校验：`pnpm validate` 依次执行 `validate:content`、`validate:output`、`validate:links`、`validate:reading-paths`
- 截图回归：`pnpm screenshot:capture` + `pnpm screenshot:compare` 产出 `docs/baselines/screenshots/` 工件；capture harness 会关闭动画与 transition，确保 diff 可重复
- Lighthouse 回归：`pnpm lighthouse:baseline` 与 `pnpm lighthouse:validate` 在本地静态预览上启动干净的 headless Chromium，会把 baseline/current/validate 工件写入 `docs/baselines/lighthouse/`
- Live parity：`pnpm validate:parity` 访问 `site.config.json` 中的 live URL，校验首页、`/briefing/`、`/tech/`、`404`、代表性详情页、lead topic 与代表性 `/_astro` 资源；latest `live-parity-report.json` 为 `routeCount: 7`、`errorCount: 35`
- 当前 Lighthouse fixture 范围：`home`、`essay-lead`、`briefing-index`、`digest-lead`、`topic-lead` 共 5 个 fixture，覆盖 `desktop` / `mobile` 两个 profile
- 当前 Lighthouse 门禁：
  - 桌面：`Performance >= 0.90`、`Accessibility >= 0.95`、`SEO >= 0.95`
  - 移动：`Performance >= 0.85`、`Accessibility >= 0.95`、`SEO >= 0.95`
  - 回归阈值：`FCP / LCP / TBT / CLS` 按 `baseline-fixture-matrix.json` 中的 `maxRegression` 规则检查
- 当前 Lighthouse 运行方式：每个 fixture/profile 执行 1 次，脚本自启本地静态服务并使用临时 `127.0.0.1` 端口；实际端口记录在各 JSON report 的 `requestedUrl` / `finalUrl`
- 尚未自动化的测量：3 次取中位数协议、INP、HTML / JS / CSS 体积预算

### 内容一致性

- [已完成] 29 个 `/blog/:slug` 页面标题与源数据完全一致
- [已完成] 29 个 `/blog/:slug` 页面摘要与源数据完全一致
- [已完成] 29 个 `/blog/:slug` 页面通过 `源内容一致性` 校验；baseline manifest 已生成
- [已完成] `fixture matrix` 已覆盖结构化日报、markdown fallback、隐藏 hero 等详情页边界场景；相关桌面/移动截图工件已生成
- [已完成] 所有图片 URL 与原站一致
- [已完成] 所有发布日期与阅读时长与原数据一致

### 路由与链接

- [已完成] `/`、`/blog`、`/briefing`、`/tech` 可访问
- [已完成] 全部既有 `/blog/:slug` 可访问
- [已完成] 曾缺失的 `/blog/ai-daily-2026-03-31/` 已回到 route manifest 与构建产物
- [已完成] 新增 `/topic/:slug` 全部可访问
- [已完成] `validate-built-links.mjs` 已对 43 个种子路由完成站内爬检；latest `link-crawl-report.json` 为 `errorCount: 0`
- [已完成] `validate-reading-paths.mjs` 已产出 `reading-path-report.json`；latest report 为 9 篇 essay，且 `orphan / thin / deskFallbackMissing / duplicateEssays` 均为空
- [部分完成] 返回导航、topic 跳转、subscribe CTA 全链路已通；digest 邻接已改为真实连续 issue，topic 导读更清晰，但跨 topic 的阅读链深度仍可加强

### SEO 与静态输出

- [已完成] 所有页面都有唯一 canonical
- [已完成] `/briefing` 为日报中心 canonical
- [已完成] `/tech` 仅输出最小兼容页，不渲染完整 briefing 列表副本
- [已完成] `/tech` 同时满足 `canonical=/briefing/`、`noindex,follow`、`meta refresh`、可见手动链接
- [已完成] `feed.xml` 正常产出，条目数与长文数一致
- [已完成] `sitemap.xml` 正常产出，包含全部公开页面
- [已完成] 文章与日报详情页 JSON-LD 已接入，并由静态输出 validator 做到页面级检查

### UI 与可访问性

- [已完成] `fixture matrix` 中全部页面已生成桌面端 `1440px` 的 baseline/current/diff 截图工件
- [已完成] `fixture matrix` 中全部页面已生成移动端 `390px` 的 baseline/current/diff 截图工件
- [已完成] `SiteLayout` 已接入 `Skip to main content` skip link；全局 focus ring 与主题切换已接入基础 chrome
- [已完成] 截图 capture/compare 已采用确定性策略；latest `screenshot-diff-report.json` 为 `diffs: []`、`missing: []`
- [已完成] Lighthouse baseline/validate 已形成当前本地 a11y / performance / SEO 硬门禁；latest pass 覆盖 5 个 fixture × 2 个 profile，CLS 当前均为 0
- [部分完成] 键盘流程、读屏体验和手动可访问性审计仍未形成系统性人工回归记录

### 构建与发布

- [已完成] `pnpm build` 成功
- [已完成] `baseline:generate`、`build`、`validate`、`screenshot:capture`、`screenshot:compare`、`lighthouse:baseline`、`lighthouse:validate` 已形成当前本地固定校验链
- [已完成] `docs/baselines/lighthouse/` 下已存在 baseline/current summary、manifest 和 validate report 工件
- [已完成] deploy workflow 已纳入 GitHub Pages 上传前 `pnpm build` + `pnpm validate:ci`，并在发布后追加 `pnpm validate:parity`
- [部分完成] live parity 校验链已经接通并产出报告，但 latest `live-parity-report.json` 仍为 `errorCount: 35`；production 目前仍落后于仓库最新版本
- [未完成] 构建日志无重复渲染警告、无 orphan route 警告

## 14. 验收指标

本次重构完成后，至少满足以下量化指标；所有测量均按 `13.1 测量协议` 执行：

- 既有公开 slug 保留率：100%（已完成）
- 既有正文文本一致率：100%（已完成，baseline manifest 已生成）
- fixture matrix 截图工件覆盖率：100%（已完成，桌面/移动 baseline/current/diff 已生成）
- 站内死链数：0（已完成；latest `link-crawl-report.json` 覆盖 43 个种子路由且 `errorCount: 0`）
- reading-path orphan / thin essay 数：0（已完成；latest `reading-path-report.json` 无 orphan / thin / duplicate / desk fallback 缺口）
- GitHub Pages live parity `errorCount`：0（未完成；latest `live-parity-report.json` 为 `35`，且 `/_astro` 代表性资源缺失、`/tech/`、`/404.html`、`/topic/ai/` 等仍显示旧版本特征）
- `.bak` 文件留存数：0（已完成）
- 重复页面模板实现数：0（已完成）
- Lighthouse 分类门禁：桌面 `Performance >= 90`、移动 `Performance >= 85`、`Accessibility >= 95`、`SEO >= 95`（已完成；latest validate 覆盖 5 个 fixture × 2 个 profile 并全部通过）
- 文章详情页首屏执行 JavaScript：尽量趋近于 0；硬上限 30 KB gzip（部分完成，结构上已静态优先，但未做体积门禁）
- CLS：< 0.05（已完成；latest Lighthouse fixtures 当前均为 `0`）
- INP：< 200ms（未完成；当前 Lighthouse 脚本未采集 INP）
- 首屏主内容 LCP：< 2.5s（部分完成；当前 audited fixtures 中除 mobile `home` 为 `2704ms` 外，其余 fixture 均低于该阈值）

## 15. 完成定义

当前仓库状态：未完成。展示层、路由、SEO、内容适配、subscribe CTA、Plausible gating、baseline manifest、内链爬检、reading-path report、确定性截图回归以及 Lighthouse baseline/validate 门禁已经落地并通过；deploy workflow 也已经加严到上传前执行 `validate:ci`、发布后执行 `validate:parity`。当前剩余缺口主要在 GitHub Pages live parity 仍失败且 production 仍是旧版本、HTML / JS / CSS / INP 预算、首页 mobile LCP 以及跨 topic 阅读链条的进一步加深。

只有当以下条件全部满足时，本次重构才算完成：

1. [部分满足] 新展示层已经替换当前仓库与本地构建产物里的旧展示层，不再依赖旧 React 页面与 `postbuild-static-routes.mjs` 的重复 HTML 拼接；但 latest live parity 仍表明 production 还没有完全切到这一版本。
2. [部分满足] 全部既有公开路径在本地构建产物中保持有效，且内容校验、站内链接爬检与截图回归都已通过；`ai-daily-2026-03-31` 已补回构建产物，但 latest `live-parity-report.json` 仍为 `errorCount: 35`，说明 production 公开站点尚未与仓库预期对齐。
3. [部分满足] 首页、长文归档、日报中心、长文详情、日报详情、topic 页、404 页都已在仓库构建产物和本地校验链中完成；reading-path validator 也已通过，但 production 仍是旧版本，且跨 topic 的导读与 follow 闭环仍偏薄。
4. [已满足] SEO、RSS、sitemap、canonical、JSON-LD 全部由统一 route manifest 导出。
5. [部分满足] `.bak` 文件已清零，重复模板主链路已收口；但孤儿组件/遗留上下文仍缺一条更明确的最终清场清单。
6. [已满足] 设计系统、内容适配层、SEO 工具层的边界已清晰；subscribe CTA、Plausible gating、baseline manifest、link crawl / reading-path report 和静态输出 / 内容 validator 已收口。
7. [部分满足] 桌面与移动端截图回归链路、Lighthouse baseline/validate、本地 build/validate，以及 GitHub Pages 上传前 `validate:ci` / 发布后 `validate:parity` 已形成当前回归底线；但 latest live parity 仍失败，INP / bundle-size 门禁和首页 mobile LCP 仍未完成。

如果只完成了首页改版、列表页改版、局部页面迁移，或仍保留双实现静态模板链路，则一律不算完成。

## 16. 执行纪律

本计划执行时必须遵守三条纪律：

- 先冻结，再迁移，再替换，最后清场；禁止一边改视觉一边猜边界。
- 先统一架构，再做局部美化；禁止在旧系统上继续叠视觉补丁。
- 任何阶段一旦发现会触碰内容源，立即停止并拆出独立项目，不得在本重构中夹带处理。

这不是一次“换皮”，而是一次“展示系统重建”。只有在内容保持完全不动的前提下，把路由、模板、SEO、样式和阅读体验全部收回到一套可验证、可维护、可扩展的体系里，这次重构才有意义。
