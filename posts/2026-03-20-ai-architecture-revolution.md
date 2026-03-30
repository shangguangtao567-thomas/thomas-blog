---
kind: "essay"
titleZh: "架构革命：为什么 AI 扩展没有放缓——而是在重新定向"
titleEn: "AI Scaling Isn't Slowing — It's Redirecting"
excerptZh: "当行业开始重写残差路径、注意力混合方式、长上下文内存机制时，这不是放缓信号；恰恰相反，这是系统层高速进化的信号。"
excerptEn: "Teams are rewriting residual paths, attention mixing, and memory mechanisms. That's not a sign AI hit a wall — it's proof that system-level evolution is accelerating faster than ever."
tag: "AI"
tagEn: "AI & ML"
image: "/images/ai-architecture-revolution.jpg"
readTime: 16
date: 2026-03-20
---

> **Target audience:** readers already familiar with the LLM training and inference stack. Core argument: when teams start rewriting residual paths, attention mixing, long-context memory mechanisms, and even the tokenizer-to-embedding interface, this isn't a sign of "nothing left to scale" — it's a signal that system-level evolution is accelerating at high speed.

---

## AttnRes and the Signal Nobody Should Be Ignoring

Lately there's been a lot of buzz around AttnRes results: GPQA-Diamond jumping from 36.9 to 44.4, Math from 53.5 to 57.1, HumanEval from 59.1 to 62.2.

Those numbers matter. But what's more important is *where* the change was made.

Moonshot AI didn't invent a new external memory system. They didn't stack another batch of experts. They rewired the most foundational, least-examined path in modern decoder-only LLMs: **how information aggregates in the depth dimension**.

In today's dominant pre-norm decoder architecture, the residual stream is essentially a continuously accumulating channel:

```
h_{l+1} = h_l + F_l(Norm(h_l))
```

The upside: stable, simple, easy to scale. The cost: in deep models, every layer's output gets added indiscriminately into the same stream. As layers stack up, early representations get progressively diluted by later layers, and residual magnitude keeps growing. Moonshot's AttnRes README puts it plainly as *dilution and hidden-state growth under PreNorm*.

AttnRes's fix is elegant: instead of defaulting to "every preceding layer accumulates with weight 1," each layer now performs a **cross-depth attention read** over earlier representations. The paper frames it as:

```
h_l = Σ α_{i→l} · v_i
```

Where `α_{i→l}` is computed from the layer's learned pseudo-query against normalized representations of prior layers.

The key insight isn't "residuals became attention" — it's that this change turns a *fixed engineering assumption* into something the model can learn to optimize: which early layers deserve repeated reads, which contributions should be downweighted, and which information should travel deep across many layers with minimal distortion.

Moonshot added a smart initialization detail: the query starts from zero. This means early training behavior is close to traditional residual connections. The model only diverges from that baseline when it actually discovers that non-uniform aggregation is genuinely useful. In other words, AttnRes doesn't force a replacement — it lets the model prove that "fixed residuals aren't good enough."

Notably, this isn't just a small-experiment win. The repo's scaling results show: **Block AttnRes can match a baseline loss curve requiring 1.25x more training compute**. This means the gains aren't benchmark-specific tricks — they're addressing something fundamentally more efficient in the architecture.

This is why AttnRes matters beyond the headline numbers. It's not another incremental optimization. It's a signal that the industry's top teams have started rewriting foundational structures that have gone largely untouched for seven years.

---

## The Real Pressure: Long-Context Economics

Step back. The industry's actual bottleneck isn't "can we add more parameters." It's **the economics of long-context processing**.

A common misconception to clear up first: not all attention costs explode as O(n²) in the decode phase. More precisely:

- During training and long-input prefill, full attention complexity scales quadratically with sequence length.
- During autoregressive decode, both single-step computation and KV cache memory scale *linearly* with context length — and that's precisely where long-context serving hits its main bottleneck.

When context windows push from 32K to 128K, 256K, even 1M tokens, the question isn't "can the model read this" — it's **how much VRAM, bandwidth, and latency are you willing to pay for this history?**

For AI agents, this isn't an edge case. Long-horizon planning, multi-turn tool calling, context management, and memory compression are all facets of the same underlying problem.

So while different teams take different implementation paths, a clear convergence is emerging: **full softmax attention is being replaced by compressed, stateful, hybrid attention systems.**

### Qwen3-Next: Gated DeltaNet + MoE Hybrid

Qwen3-Next is a textbook example. The official model card is explicit: 48 layers using a `12 * (3 * (Gated DeltaNet -> MoE) -> 1 * (Gated Attention -> MoE))` hybrid layout — roughly 75% Gated DeltaNet, 25% Gated Attention. Native context: 262,144 tokens; YaARN-extendable to 1,010,000.

The system-level payoff Qwen highlights: **80B-A3B Base outperforms Qwen3-32B-Base on downstream tasks, at just 10% of the training cost, with 10x inference throughput on 32K+ context.** That's not a marginal improvement — it's a different efficiency class.

### Kimi Linear: KDA + Global MLA

Kimi Linear takes a different path but faces identical pressure. The public repo states clearly: a **3:1 KDA-to-global MLA hybrid structure**, delivering up to 75% KV cache reduction at 1M context, and up to 6.3x faster TPOT for long-sequence decode vs. MLA. On 128K RULER, it scores 84.3 with a 3.98x speedup.

The real takeaway isn't any single benchmark number. It's that when state compression and global refresh are properly coordinated, **linear attention is no longer a "cheaper but weaker" alternative — it's becoming part of the mainstream design space.**

### MiniMax-01: Lightning Attention at Scale

MiniMax-01 provides the third data point. In their January 2026 technical release, MiniMax stacked 7 layers of Lightning Attention with 1 layer of softmax attention across 8 total layers — pushing linear attention to a **456B total parameter, 45.9B active parameter** commercial-grade model with 4M token context.

I won't frame this as "transformers are replaced by RNNs." That framing is wrong. The accurate description: **Transformer architectures are absorbing the long-horizon state and memory-friendly design principles from RNN/state-space体系.**

---

## The Shared Conclusion

The real takeaway isn't "RNNs are back." It's:

**Long-context economics are forcing a redesign of how information is stored, refreshed, and retrieved inside models.**

AttnRes addresses reading authority in the depth dimension. Qwen3-Next, Kimi Linear, and MiniMax-01 address state costs in the time dimension. They look like different modifications, but they're answering the same fundamental question:

**Do we still want to assume all history should be permanently retained in the same form?**

The answer is increasingly no.

---

## Beyond Attention: The Tokenizer–Embedding Interface

The rethinking isn't limited to attention mechanisms. **The boundary between tokenizer and embedding is revealing systemic problems too.**

Hayou and Liu's 2025 paper *Optimal Embedding Learning Rate in LLMs: The Effect of Vocabulary Size* identifies what they call the **Large Vocab Regime** — when vocabulary size far exceeds model width, training dynamics deviate sharply from the μP intuition most practitioners apply by default. Their finding: the optimal embedding LR / hidden LR ratio scales closer to `√width`, validated on 1B model pretraining experiments.

The implication isn't "every team should now tune embedding LR." What's more significant: **vocabulary size isn't a pure engineering constant — it actively reshapes training dynamics.**

In January 2026, Ayoobi et al. added another layer in *Say Anything but This: When Tokenizer Betrays Reasoning in LLMs*. Their research uncovered non-unique encoding in subword tokenizers: the same surface string can correspond to multiple different token ID sequences. Across 11,000+ substitution experiments, they found non-trivial **phantom edits** — cases where the model appeared to correctly understand and edit text, but was actually misled by tokenizer representation differences.

Together, these papers send a clear signal: **attention isn't the only bottleneck. The tokenizer-to-embedding interface itself is limiting both training efficiency and inference reliability.**

For AI practitioners, this means "architecture innovation" no longer refers only to how attention formulas are written — the entire chain from discrete representation to continuous computation is being re-examined.

---

## The Evaluation Loop Is Getting Automated Too

There's a parallel track that often gets lumped in with "architecture innovation" but deserves separate treatment: **evaluation and optimization闭环 are becoming more automated.**

A caveat on a popular sound bite: "judgment > generation" is catchy on social media but technically too coarse without qualification. The more precise statement:

**In scenarios with reference answers, verifiable rules, or explicit task feedback, models' ability to filter, compare, score, and verify has become good enough to enter training and product闭环.**

NVIDIA's *Judge's Verdict* benchmark illustrates this directly. The paper evaluated 54 LLMs as judges on "assessing response quality against ground truth" — not just relevance, but Cohen's kappa and human agreement patterns. Result: **27 models reached Tier 1, with 23 human-like and 4 super-consistent.** This doesn't mean "LLMs outperform humans on all judgment tasks" — but it does mean LLM judges can function as production-grade components in well-bounded scoring tasks.

RLVR (Reinforcement Learning with Verifiable Rewards) pushes this further. The June 2025 paper *Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs* found: when you look at not just whether the final answer is correct, but whether the chain-of-thought and answer are correct together, RLVR genuinely improves correct reasoning probability — not just redistributing the existing answer distribution.

On the industrial side: MiniMax's February 2026 Forge release describes their Agent RL system running **over 100,000 agent scaffolds and environments** during MiniMax M2.5 development, with 200k context and millions of samples/day throughput. xAI's Grok 4 announcement (July 2025) explicitly states they scaled RL training to pretraining-scale, expanding verifiable training data beyond math and code into broader domains.

(I'm deliberately sticking to claims verifiable from official pages, avoiding more dramatic framings like "self-evolving weekly" or "fully unsupervised." The defensible conclusion is strong enough on its own.)

**Once evaluators, verifiers, and environments are stable enough, the capability improvement loop no longer depends entirely on human preference labeling.**

This amplifies, rather than replaces, the architecture track described above.

---

## What All These Threads Add Up To

When you pull these threads together, what's actually happening in the industry is more significant than "another model scored higher on benchmarks."

**First, foundational structures are being rewritten.** AttnRes redefines in-depth information reading. Qwen3-Next, Kimi Linear, and MiniMax-01 redefine how information is compressed, refreshed, and retained in long contexts. The tokenizer-embedding interface is being proven to directly affect both training and inference.

**Second, long-context system costs have turned architecture from a research curiosity into a hard engineering problem.** As agents continue toward long-horizon, multi-tool, multi-stage tasks, hybrid attention, state compression, and memory management designs won't be side quests — they'll be the main storyline.

**Third, the evaluation and optimization loop is automating.** Judge models, verifiable rewards, and agent RL infrastructure are shortening the cycle of generate → verify → update.

So I don't think AI is entering a slowdown. More precisely:

**The scale-only era is decelerating — but the systems-driven era is accelerating.**

If you only look at final benchmark curves, this shift is easy to misread as incremental improvement. But look at which layers are being modified, and the picture reverses: the industry is retreating and rewriting the fundamental organization of computation — not just loss curves, token counts, and parameter numbers.

AttnRes deserves attention not because it's the final answer, but because it makes everyone acknowledge one thing again:

**The foundational architecture is far from optimized.**

When residual paths, hybrid attention, tokenizer interfaces, and judge闭环 — problems that were previously scattered — start getting reworked simultaneously in the same time window, that's typically not a precursor to slowdown.

It usually means the next acceleration has already begun.

---

## References & Sources

**Architecture & Long Context**
- [Attention Residuals, Moonshot AI, arXiv:2603.15031](https://arxiv.org/abs/2603.15031), 2026-03-18
- [MoonshotAI/Attention-Residuals GitHub](https://github.com/MoonshotAI/Attention-Residuals)
- [Qwen3-Next Official Model Card](https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Thinking-GGUF), accessed 2026-03-19
- [MoonshotAI/Kimi-Linear GitHub / Tech Report](https://github.com/MoonshotAI/Kimi-Linear)
- [MiniMax-01 Official Release](https://www.minimax.io/news/minimax-01-series-2), 2025-01-15

**Tokenizer / Embedding**
- [Optimal Embedding Learning Rate in LLMs: The Effect of Vocabulary Size, arXiv:2506.15025](https://arxiv.org/abs/2506.15025), 2025-06-17
- [Say Anything but This: When Tokenizer Betrays Reasoning in LLMs, arXiv:2601.14658](https://arxiv.org/abs/2601.14658), 2026-01-21

**Judges / RL**
- [Judge's Verdict: A Comprehensive Analysis of LLM Judge Capability Through Human Agreement, arXiv:2510.09738](https://arxiv.org/abs/2510.09738), 2025-10-10
- [NVIDIA/Judges-Verdict GitHub](https://github.com/NVIDIA/Judges-Verdict)
- [Reinforcement Learning with Verifiable Rewards Implicitly Incentivizes Correct Reasoning in Base LLMs, arXiv:2506.14245](https://arxiv.org/abs/2506.14245), 2025-06-17
- [Forge: Scalable Agent RL Framework and Algorithm, MiniMax](https://www.minimax.io/news/forge-scalable-agent-rl-framework-and-algorithm), 2026-02-13
- [Grok 4, xAI](https://x.ai/news/grok-4), 2025-07-09
