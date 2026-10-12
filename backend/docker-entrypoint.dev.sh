#!/bin/sh
set -e

# The image is built with node_modules and the Prisma client already in place, but
# `backend_node_modules` is a *persistent* named volume: once created, Docker never re-syncs it
# from a rebuilt image, so a new dependency (package.json) or a schema.prisma change can go
# missing at container start even though the image itself is up to date. Re-running both here is
# a fast no-op when nothing changed (pnpm's content-addressable store) and self-heals when it did.
cd /app
pnpm install --frozen-lockfile=false
cd /app/backend
pnpm exec prisma generate

exec pnpm run start:dev
