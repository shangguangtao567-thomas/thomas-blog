---
slug: "open-source-models-agent-orchestration"
titleZh: "2026 春节档 AI 大乱斗：Qwen3.5、MiniMax M2.5、GLM-5、Kimi K2.5 深度对比，以及我对 OpenClaw 层级价值的判断"
titleEn: "Qwen3.5 vs GLM-5 vs Kimi K2.5: Why Agent Orchestration Wins"
excerptZh: "四个模型的技术路线各有侧重，但有一个共同方向：把工具调用和 Agent 能力放在比\"聪明程度\"更优先的位置。这背后，是 OpenClaw 这个层级正在崛起的价值。"
excerptEn: "Four Chinese AI models dropped in one week — all prioritizing tool-calling over raw intelligence. Here's what each does differently, and why the orchestration layer is the real winner."
tag: "AI"
tagEn: "AI"
image: "/images/open-source-models-agent-orchestration.jpg"
readTime: 18
publishedAt: "2026-03-03"
---

<!-- CONTENT_EN -->
In the week surrounding Chinese New Year 2026, China's AI scene put on a collective release show: Qwen3.5, MiniMax M2.5, GLM-5, and Kimi K2.5 all dropped within days of each other. I've been putting each of them through their paces, and the more I use them, the more I notice something interesting—their technical approaches differ, but they share a common direction: **prioritizing tool-calling and agent capabilities over raw intelligence**.

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

*These are my thoughts from recent experimentation—not necessarily right, happy to discuss.*

<!-- CONTENT_ZH -->
2026 年的春节档，中国 AI 圈上演了一场集体发布秀：Qwen3.5、MiniMax M2.5、GLM-5、Kimi K2.5 在短短一周内相继亮相。我把这几个模型都折腾了一遍，越用越觉得有意思——它们的技术路线各有侧重，但有一个共同的方向：**把工具调用和 Agent 能力放在了比"聪明程度"更优先的位置**。

这篇文章是我的调研笔记，最后会聊聊我从中得出的一个判断。

---

## 我的判断：OpenClaw 这个层级的价值

用了这几个模型一段时间之后，我有一个越来越强烈的感受。

现在的 AI 工具使用范式，大致是这样的：你打开 Claude 或 ChatGPT，描述你的需求，等它给你答案，然后你再去执行。模型是"顾问"，你是"执行者"。

但 OpenClaw 这类工具代表的是另一种范式：**模型本身就是执行者**。它不只是给你建议，而是直接调用工具、执行命令、管理文件、发送消息。你描述目标，它完成任务。

*以上是我最近折腾这几个模型的一些想法，不一定对，欢迎讨论。*
