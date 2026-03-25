---
kind: "essay"
titleZh: "AI 的下一个突破，不是更长上下文，而是学会忘掉什么"
titleEn: "The Next Breakthrough in AI Isn't More Context. It's Learning What to Forget."
excerptZh: "模型已经很会在一个窗口里分配注意力了。更深的瓶颈是跨时间的记忆管理：什么该写入，什么该保留，什么该衰减，什么该重放。"
excerptEn: "Models already know how to allocate attention inside a window. The deeper bottleneck is memory across time: what to write, keep, decay, replay, and compress into abstraction."
tag: "AI"
tagEn: "AI & ML"
pillar: "Memory Architecture"
pillarZh: "记忆架构"
keywords: "llm memory, forgetting, abstraction, DeepSeek MLA, LightMem, CraniMem, KV cache, context caching"
xHookZh: "AI 的下一个突破，不是更长上下文，而是一套删除策略。"
xHookEn: "The next AI breakthrough isn't a longer context window. It's a deletion policy."
readTime: 12
date: 2026-03-25
---

We keep talking about context windows as if intelligence scales by remembering more.

I think that is backwards.

The next breakthrough in AI is not a 10M-token prompt. It is a memory system that knows what to write, what to keep, what to decay, and what to replay.

In other words: **intelligence is not raw retention. It is compression with a deletion policy.**

That sounds abstract until you look at how both brains and models actually work.

## More Memory Is Not the Same as More Intelligence

Human perception is already a filtering system.

Your eyes do not capture the whole visual field at uniform resolution. The center is sharp. The periphery is coarse. Your brain fills in the rest. We experience that as "seeing everything," but biologically it is a highly compressed and selective pipeline.

Memory works the same way.

If I ask what you usually eat for lunch, you do not replay the last 2,000 lunches one by one. You compress them into a pattern:

- I usually eat fast on workdays.
- I tend to choose noodles over rice.
- I skip lunch when I am overloaded.

That answer is useful precisely because it forgets most of the details.

A child learning the concept of "dog" does not keep every dog as a separate perfect recording forever. The child has to discard fur color, lighting, angle, background, and one-off context in order to retain the reusable structure. That is what abstraction is: not the accumulation of examples, but the selective destruction of what does not matter.

This is why perfect memory is not obviously a blessing. Borges saw this clearly in "Funes the Memorious." A mind that cannot forget can end up trapped by particulars. It remembers too much to generalize.

That is also why I do not think "more memory" is the right primitive for AI. The right primitive is **memory governance**.

## Compression Already Runs the Whole AI Stack

This is not just a philosophical claim. It is already how modern systems are built.

At training time, model parameters are a compression of the training distribution. A frontier LLM does not memorize the internet line by line. It compresses recurring structure: language patterns, world regularities, reasoning templates, latent schemas.

At inference time, the model compresses the current interaction again, this time into hidden states and the KV cache. That KV cache is not "knowledge" in the long-term sense. It is more like working memory: the transient state needed to continue the current thought.

And even that working memory is now being compressed.

DeepSeek-V2 made this explicit with Multi-head Latent Attention. Instead of storing the full KV state for every token in the usual way, it compresses the cache into a latent representation. The paper reports a **93.3% KV-cache reduction** and up to **5.76x higher maximum generation throughput** versus DeepSeek 67B. That is not a cosmetic systems trick. It is a very concrete admission that the default representation of "remember everything in full detail" is too expensive to survive.

Then the industry pushed one step further.

Researchers started asking: if part of the context repeats across requests, why recompute it at all? Why not store the processed state itself?

That is the logic behind cache reuse, prefix caching, and context-augmented generation built on stored KV state. A 2025 paper on reusing stored KV cache argued that precomputed KV reuse can save both delay and cloud cost for long-context workloads. CacheGen earlier showed that compressed KV streaming could reduce KV size by **3.5-4.3x** and lower end-to-end delay by **3.2-3.7x** with minimal quality loss.

This matters because it changes what retrieval means.

Classic RAG retrieves raw text and asks the model to understand it again.

Stored-KV systems retrieve something closer to **already processed state**.

That starts to look less like "search" and more like "recall."

But it also exposes a limit. A March 2026 study on chunk-level KV-cache reuse found that these systems still miss cross-chunk dependencies and therefore hit quality ceilings. So yes, externalized cache is elegant. But raw cache reuse is still not the same thing as a mature memory system. It helps you remember faster. It does not automatically tell you **what should have been remembered in the first place**.

## Compression Alone Is Not Intelligence

At this point it is important to make a distinction.

ZIP compression is not intelligence.

A ZIP file can compress a novel without understanding plot, motive, irony, or metaphor. JPEG can compress a cat photo without understanding what a cat is.

So when I say intelligence comes from compression, I do **not** mean generic lossless coding. I mean **task-shaped, lossy, selective compression**.

That is where forgetting enters.

Forgetting is what turns compression into abstraction.

Human memory research has been saying this for years. Simon Nørby's 2015 review, *Why Forget? On the Adaptive Value of Memory Loss*, argues that forgetting is not merely failure. It supports emotion regulation, abstraction, automatization, and context updating. Other work shows that retrieval itself can suppress competing memories, reducing interference rather than merely erasing content at random.

This is a subtle but crucial point.

The function of forgetting is not just to free storage space.

Its deeper function is to prevent the system from drowning in competing traces.

If every memory remained equally available forever, the real bottleneck would not be capacity. It would be retrieval conflict. The system would be flooded by too many candidates with no clear ranking.

This is also why memories often become more semantic over time. We stop remembering the exact sentence and start remembering what was meant. We stop remembering every individual lunch and start remembering our habits. We stop remembering every single meeting verbatim and start remembering who is reliable, who stalls, and where the actual tension is.

That is not memory becoming weaker. It is memory being reorganized.

## Today's Models Are Good at Spatial Attention and Weak at Time Attention

Transformer attention solved one problem extremely well: inside a window, the model can decide what to read.

But a real memory system has to solve at least five more:

- What should be written to memory?
- How long should it be kept?
- What should decay even if storage is available?
- What should be replayed offline for consolidation?
- What should be rewritten when new evidence arrives?

Current LLMs are much better at the first question than the other five.

That is why I do not think longer context is the same thing as better memory.

A 1M-token window mostly gives you a larger desk. It does not give you a librarian, an archivist, or a sleep cycle.

This is also why RNN-style and state-space ideas keep returning in new forms. RNNs, linear attention, and Mamba-like systems are interesting not because they magically "replace transformers," but because they treat time as a rolling state update rather than a giant document to be reread. They feel closer to a living system. They are trying to answer a different question:

How do you stay coherent across time when you cannot afford to preserve everything in explicit form?

I suspect the future will not be one architecture winning outright. It will be layered:

- a fast rolling state for immediate continuity
- a bounded episodic buffer for recent events
- a structured long-term store for semantic memory
- a retrieval mechanism for exact evidence when precision matters

That stack is much closer to how useful intelligence works in practice.

## The Hippocampus Turn Has Already Started

This is where the recent memory-system work becomes genuinely interesting.

The strongest new examples are not trying to brute-force longer prompts. They are trying to build **multi-stage memory architectures**: the recent MSA-style line of work that treats memory less like a vector database and more like a bounded cognitive system.

LightMem is one of the clearest cases. First submitted on **October 21, 2025** and later accepted to ICLR 2026, it is explicitly inspired by the Atkinson-Shiffrin model of human memory. It separates memory into:

- **sensory memory** for rapid filtering and lightweight compression
- **short-term memory** for topic-aware consolidation and structured summaries
- **long-term memory** with an offline, "sleep-time" update process

That last part matters a lot. Consolidation is decoupled from online inference. The system does not try to fully reorganize memory while also answering the user in real time. It writes a tractable trace first, then performs slower semantic integration later. On LongMemEval and LoCoMo, the paper reports consistent gains over strong baselines, including up to **7.7% / 29.3%** higher QA accuracy, up to **38x / 20.9x** lower total token usage, and even larger reductions when counting purely online inference cost.

That is the closest thing I have seen recently to a hippocampus-style engineering move: not "store everything," but "filter early, keep a bounded working trace, and consolidate later."

The trend did not stop there.

CraniMem, submitted on **March 3, 2026**, pushes the same idea further for agent systems. It combines:

- goal-conditioned gating
- utility tagging
- a bounded episodic buffer for near-term continuity
- a structured long-term knowledge graph for semantic recall
- scheduled consolidation that replays high-utility traces and prunes low-utility ones

The paper's key claim is not simply higher recall. It is **robustness under distraction**. CraniMem outperforms Vanilla RAG and Mem0 baselines on long-horizon benchmarks, especially when noisy or irrelevant information is injected.

That result fits the larger thesis perfectly.

A mature memory system should not just remember more. It should remember more **selectively**, and it should degrade more gracefully in the presence of noise.

In other words, forgetting is not the opposite of robustness. It is one of its causes.

## Why This Matters for AGI Claims

I agree with the broad intuition that online adaptation, continuous interaction, and feedback-driven updating can push AI much closer to human-level intelligence, and likely beyond it in some dimensions.

But I would not say it is automatic.

Online updating without a deletion policy can easily become contamination.

If the system writes too much, it bloats.
If it writes too little, it stagnates.
If it never rewrites old memories, it becomes outdated.
If it rewrites too aggressively, it drifts.

This is true for products too, not just theory.

A personal AI assistant that remembers every user preference forever will quickly become wrong. Preferences change. Roles change. Projects die. Temporary constraints expire. If every old instruction stays live with equal force, the assistant does not become more personalized. It becomes more confused.

So the path to stronger AI is not just "online learning."

It is:

- online learning
- bounded memory
- selective retention
- active forgetting
- replay and consolidation
- structured retrieval

That is a much harder design problem than just extending context length. But it is also much closer to the real bottleneck.

## The Right Question

The wrong question is:

> How do we make models remember everything?

The better question is:

> How do we make models remember like a system under real constraints?

That means limited bandwidth.
Limited attention.
Limited storage.
Limited retrieval time.
And a changing world where old information can become actively harmful.

Once you view the problem that way, the direction becomes clearer.

The next AI breakthrough is probably not another context window headline.

It is a memory architecture that can:

- notice what matters now
- write only what is worth preserving
- forget what has lost utility
- replay what deserves consolidation
- compress repeated experience into reusable abstraction

That is what human memory does imperfectly.

And that is what AI still mostly lacks.

The deepest leap may come when models stop treating memory as a flat archive and start treating it as a living system.

Not more context.

Better forgetting.

## References & Sources

- [DeepSeek-V2: A Strong, Economical, and Efficient Mixture-of-Experts Language Model](https://arxiv.org/abs/2405.04434), submitted 2024-05-07
- [CacheGen: KV Cache Compression and Streaming for Fast Large Language Model Serving](https://arxiv.org/abs/2310.07240), submitted 2023-10-11
- [Towards More Economical Context-Augmented LLM Generation by Reusing Stored KV Cache](https://arxiv.org/abs/2503.14647), submitted 2025-03-18
- [An experimental study of KV cache reuse strategies in chunk-level caching systems](https://arxiv.org/abs/2603.20218), submitted 2026-03-03
- [LightMem: Lightweight and Efficient Memory-Augmented Generation](https://arxiv.org/abs/2510.18866), submitted 2025-10-21, revised 2026-02-28
- [CraniMem: Cranial Inspired Gated and Bounded Memory for Agentic Systems](https://arxiv.org/abs/2603.15642), submitted 2026-03-03
- [Why Forget? On the Adaptive Value of Memory Loss](https://pubmed.ncbi.nlm.nih.gov/26385996/), 2015-09
- [Retrieval induces adaptive forgetting of competing memories via cortical pattern suppression](https://www.nature.com/articles/nn.3973), 2015-03
