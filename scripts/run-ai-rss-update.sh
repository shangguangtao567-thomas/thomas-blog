#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/thomas-blog}"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

echo "[ai-rss] repo: $REPO_DIR"

if [ -d .git ]; then
  if git diff --quiet && git diff --cached --quiet; then
    git pull --rebase origin "$BRANCH" || true
  else
    echo "[ai-rss] working tree dirty, skip pull"
  fi
else
  echo "[ai-rss] warning: .git directory not found, skip pull/push"
fi

export FETCH_COUNT="${FETCH_COUNT:-24}"
export MAX_AGE_DAYS="${MAX_AGE_DAYS:-3}"
export MAX_PER_SOURCE="${MAX_PER_SOURCE:-4}"

node scripts/fetch-ai-candidates.mjs

echo "[ai-rss] candidates ready: src/data/ai-candidates.json"
