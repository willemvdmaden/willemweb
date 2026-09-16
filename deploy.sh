#!/bin/bash
# Deploy the site: build Astro, publish dist/ to the gh-pages branch.
#
# Two paths on gh-pages are NOT the build's to manage and survive every deploy:
#   .github/       — the sync workflow lives on gh-pages because it is the default
#                    branch, the only place schedules run.
#   journalkernel/ — owned by the sync workflow, which pulls it daily from
#                    willemvdmaden/journalkernel-web. public/ carries no copy on
#                    purpose; a copy here would be a second, staling truth.
set -euo pipefail
cd "$(dirname "$0")"

npm run build

WT=../willemweb-deploy-$$
git fetch origin gh-pages
git worktree add "$WT" origin/gh-pages
trap 'git worktree remove "$WT" --force' EXIT

rsync -a --delete \
  --exclude='.git' \
  --exclude='.github' \
  --exclude='journalkernel' \
  dist/ "$WT"/

cd "$WT"
git add -A
if git diff --cached --quiet; then
  echo "Nothing to deploy."
  exit 0
fi
git commit -m "Deploy site"
git push origin HEAD:gh-pages
echo "Deployed."
