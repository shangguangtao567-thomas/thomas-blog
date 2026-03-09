#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/thomas-blog}"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

echo "[ai-rss] repo: $REPO_DIR"

if [ -d .git ]; then
  git pull --rebase origin "$BRANCH" || true
else
  echo "[ai-rss] warning: .git directory not found, skip pull/push"
fi

export OPENAI_API_KEY="${OPENAI_API_KEY:-${OPENROUTER_API_KEY:-}}"
export OPENAI_BASE_URL="${OPENAI_BASE_URL:-https://openrouter.ai/api/v1}"
export OPENAI_MODEL="${OPENAI_MODEL:-openai/gpt-4.1-mini}"
export FETCH_COUNT="${FETCH_COUNT:-24}"
export MAX_AGE_DAYS="${MAX_AGE_DAYS:-3}"
export MAX_ITEMS_TO_KEEP="${MAX_ITEMS_TO_KEEP:-60}"

node scripts/fetch-ai-rss.mjs

if [ -d .git ] && ! git diff --quiet src/data/tech-news.json; then
  git add src/data/tech-news.json
  git add scripts/rss-sources.json scripts/fetch-ai-rss.mjs scripts/run-ai-rss-update.sh package.json pnpm-lock.yaml 2>/dev/null || true
  git commit -m "chore: update AI RSS digest [$(date '+%Y-%m-%d')]" || true
  git push origin "$BRANCH"
else
  echo "[ai-rss] No changes to commit."
fi
