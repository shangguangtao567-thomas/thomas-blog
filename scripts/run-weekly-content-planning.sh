#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/thomas-blog}"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

node scripts/build-weekly-content-opportunities.mjs

if [ -d .git ] && ! git diff --quiet src/data scripts package.json README.md; then
  git add src/data scripts package.json README.md
  git commit -m "chore: refresh weekly content opportunities [$(date '+%Y-%m-%d')]" || true
  git push origin "$BRANCH"
else
  echo "[weekly-content-planning] No planning updates to commit."
fi
