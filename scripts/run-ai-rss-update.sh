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
fi

export FETCH_COUNT="${FETCH_COUNT:-24}"
export MAX_AGE_DAYS="${MAX_AGE_DAYS:-3}"
export MAX_PER_SOURCE="${MAX_PER_SOURCE:-4}"
export SITE_URL="${SITE_URL:-https://guangtaos29545.github.io/thomas-blog}"

node scripts/fetch-ai-candidates.mjs
node scripts/build-ai-digest.mjs
pnpm build

if [ -d .git ] && ! git diff --quiet posts src/data scripts package.json README.md; then
  git add posts src/data scripts package.json README.md
  git commit -m "chore: refresh AI daily digest [$(date '+%Y-%m-%d %H:%M')]" || true
  git push origin "$BRANCH"
else
  echo "[ai-rss] No digest changes to commit."
fi

echo "[ai-rss] report ready: src/data/ai-digest-report.txt"
