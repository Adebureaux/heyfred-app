#!/bin/sh
set -e

# See backend/docker-entrypoint.dev.sh for why: `frontend_node_modules` is a persistent named
# volume that Docker never re-syncs from a rebuilt image, so a new dependency can go missing at
# container start even though the image itself is up to date. Re-running install here is a fast
# no-op when nothing changed and self-heals when it did.
cd /app
pnpm install --frozen-lockfile=false
cd /app/frontend

exec pnpm run dev
