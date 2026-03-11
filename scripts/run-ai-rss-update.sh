#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/thomas-blog}"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

echo "[ai-rss] repo: $REPO_DIR"

HAS_GIT=0
if [ -d .git ]; then
  HAS_GIT=1
  if git diff --quiet && git diff --cached --quiet; then
    git pull --rebase origin "$BRANCH" || true
  else
    echo "[ai-rss] working tree dirty, skip pull"
  fi
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

if [ "$HAS_GIT" -eq 1 ] && ! git diff --quiet src/data/tech-news.json; then
  git add src/data/tech-news.json
  git commit -m "chore: update AI RSS digest [$(date '+%Y-%m-%d')]" || true
  git push origin "$BRANCH"
else
  echo "[ai-rss] No digest changes to commit."
fi
