#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$HOME/projects/thomas-blog}"
BRANCH="${BRANCH:-main}"

cd "$REPO_DIR"

node scripts/build-x-drafts.mjs
pnpm build

if [ -d .git ] && ! git diff --quiet x-drafts src/data scripts package.json README.md site.config.json; then
  git add x-drafts src/data scripts package.json README.md site.config.json
  git commit -m "chore: refresh midday X draft pack [$(date '+%Y-%m-%d %H:%M')]" || true
  git push origin "$BRANCH"
else
  echo "[midday-content-ops] No X draft updates to commit."
fi
