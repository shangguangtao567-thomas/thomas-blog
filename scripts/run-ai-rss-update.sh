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
node scripts/build-ai-digest.mjs
pnpm build

if [ -d .git ] && ! git diff --quiet src/data/tech-news.json src/data/ai-candidates.json src/data/ai-digest-report.txt; then
  git add src/data/tech-news.json src/data/ai-candidates.json src/data/ai-digest-report.txt package.json scripts/fetch-ai-candidates.mjs scripts/build-ai-digest.mjs scripts/run-ai-rss-update.sh
  git commit -m "chore: refresh AI digest [$(date '+%Y-%m-%d %H:%M')]" || true
  git push origin "$BRANCH"
else
  echo "[ai-rss] No digest changes to commit."
fi

echo "[ai-rss] report ready: src/data/ai-digest-report.txt"
