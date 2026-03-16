# AI Digest Round-2 Handoff

## What changed

The digest system now has a local, layered pipeline instead of a single RSS-snippet formatting step:

1. `scripts/fetch-ai-candidates.mjs`
   - pulls RSS candidates,
   - dedupes and scores them,
   - reuses prior cached body fields when available,
   - attempts deterministic full-article body fetches for high-value items,
   - writes `src/data/ai-candidates.json` with body-fetch metadata.

2. `scripts/build-ai-digest.mjs`
   - filters the last 24 hours,
   - generates stronger local explanations with rule-based bilingual output,
   - writes structured issue data to `src/data/ai-digest-details.json`,
   - updates `src/data/tech-news.json`, `src/data/ai-digests.json`,
   - regenerates the Markdown issue in `posts/` for fallback/content export,
   - writes both `src/data/ai-digest-report.txt` and `src/data/ai-digest-report.json`.

3. `scripts/run-ai-rss-update.sh`
   - runs the refresh,
   - builds the site,
   - commits + pushes when needed,
   - sends a Discord success report **after** a successful published update when `DISCORD_WEBHOOK_URL` is configured.

## New repo-level ingredients

- `scripts/lib/ai-digest/shared.mjs`: common helpers.
- `scripts/lib/ai-digest/body-fetcher.mjs`: deterministic body extraction from public article HTML.
- `scripts/lib/ai-digest/digest-engine.mjs`: classification, bilingual explanation, issue/report generation.
- `src/data/ai-digest-details.json`: structured per-issue detail payload for the dedicated digest page UI.
- `learning/`: minimal repo-local staging area for one-off CODE+PARA aligned learning deposits.

## UI / UX changes

- AI daily issues now render through a dedicated briefing layout instead of the generic post template.
- The digest hub and homepage digest entry now surface:
  - bilingual issue summaries,
  - theme clusters,
  - full-body fetch coverage,
  - stronger “why it matters” previews.
- Build-time post parsing now correctly respects `<!-- CONTENT_EN -->` and `<!-- CONTENT_ZH -->`, which fixes bilingual article rendering more broadly.

## Discord reporting contract

- Required env for delivery: `DISCORD_WEBHOOK_URL`
- Source: `src/data/ai-digest-report.json`
- Guarantees:
  - success message wording,
  - website digest URL included,
  - short bilingual summary.

If the webhook is unset, the report step skips cleanly.

## Minimal learning deposition

This repo still does **not** become the memory system.

Instead, it now supports a one-off candidate deposit flow:

- template: `learning/templates/digest-deposition-template.md`
- generator: `node scripts/create-learning-deposit.mjs`
- default output: `learning/inbox/YYYY-MM-DD-ai-digest-learning-deposit.md`

This keeps the digest system aligned with CODE+PARA without changing how long-term memory is stored elsewhere.

## Safe future use of local Codex chat history

Not implemented now, but the safest future path is:

1. **Local-only export**
   - only consume chats exported from the same machine,
   - never auto-pull hosted transcripts into the repo.

2. **Secret and noise filtering first**
   - strip paths, tokens, env values, personal identifiers, and large code dumps,
   - keep only durable lessons, decision logs, and reusable heuristics.

3. **Human-reviewed distillation**
   - convert raw chats into summarized notes,
   - require manual review before anything becomes a learning deposit.

4. **Provenance metadata**
   - track source type as `codex-chat-local`,
   - keep timestamp, repo/project context, and confidence.

5. **PARA destination after review**
   - route distilled notes into Project / Area / Resource / Archive buckets,
   - keep raw chat logs outside Git whenever possible.

In short: future chat-history ingestion should be **opt-in, local, redacted, distilled, and reviewed**—not automatic raw memory capture.
