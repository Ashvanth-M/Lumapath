#!/usr/bin/env bash
# One-time move of the frontend into frontend/, alongside backend/.
# Run from the repository root with Git Bash:  bash move-frontend.sh
# Delete this file afterwards.

set -euo pipefail

if [ ! -f vite.config.ts ]; then
  echo "vite.config.ts not found — run this from the repository root." >&2
  exit 1
fi

if [ -d frontend ]; then
  echo "frontend/ already exists — nothing to do." >&2
  exit 1
fi

echo "==> Committing current work so the move is a separate, reviewable step"
git add -A
git commit -m "Fix Supabase migration, remove hardcoded data, add backend service" || {
  echo "Nothing to commit, continuing."
}

echo "==> Removing root build output (builds now happen inside frontend/)"
rm -rf .output .nitro

echo "==> Creating frontend/ and moving the app into it"
mkdir frontend
git mv \
  src \
  public \
  package.json \
  package-lock.json \
  bun.lock \
  bunfig.toml \
  tsconfig.json \
  vite.config.ts \
  components.json \
  eslint.config.js \
  .prettierrc \
  .prettierignore \
  .env.example \
  frontend/

echo "==> Moving untracked local files"
[ -d node_modules ] && mv node_modules frontend/ || true
[ -f .env.local ] && mv .env.local frontend/ || true

echo "==> Clearing stale caches that hold absolute paths"
rm -rf frontend/node_modules/.vite frontend/node_modules/.nitro

echo "==> Committing the move"
git add -A
git commit -m "Move frontend into frontend/ alongside backend/"

cat <<'DONE'

Done. New layout:

  LumaPath-AI/
  ├── frontend/   the React app
  ├── backend/    the FastAPI service
  └── supabase/   shared migrations

Frontend commands now run from frontend/:

  cd frontend
  npm run typecheck
  npm run build
  npm run dev

If anything looks wrong, this move is one commit — `git revert HEAD` undoes it.
You can now delete move-frontend.sh.
DONE
