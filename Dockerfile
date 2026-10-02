# syntax=docker/dockerfile:1

# Render deploys from its own Node runtime and never reads this file — see
# `docs/plans/08-deploy.md`. It is here for a host that wants an image and for
# running the production build on a laptop, and CI builds it on every push so
# it cannot drift out of working order unnoticed.

FROM node:26-alpine AS build

WORKDIR /repo

# The manifests alone, so a change to source code does not re-resolve the
# dependency tree.
#
# One line per workspace package, and a new package needs one here or
# `--frozen-lockfile` refuses an install the lockfile says has five projects
# and the image has four. The list is the price of the cache layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/game/package.json apps/game/
COPY apps/server/package.json apps/server/
COPY packages/core/package.json packages/core/
COPY packages/protocol/package.json packages/protocol/

# Node 25 stopped bundling corepack, so it comes from npm: it is what installs
# the exact pnpm `packageManager` pins and checks it against that hash.
RUN npm install --global corepack && corepack enable && pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

# `--legacy` because the workspace does not inject its packages: pnpm v10 and
# up refuse a plain deploy without it. The output is the server package with
# production dependencies only — the bundle inlines `@taverla/*` and
# `@adrienlcp/*`, so what is left is hono, zod and nanoid.
RUN pnpm --filter @taverla/server --prod --legacy deploy /server

FROM node:26-alpine AS runtime

ENV NODE_ENV=production

# The same relative path Render passes, from the same working directory:
# `serveStatic` resolves its root against the process's cwd, so an image whose
# layout differs from the deployment's would serve the SPA from nowhere.
ENV SERVE_GAME_FROM=../game/dist

WORKDIR /app/server

COPY --from=build /server ./
COPY --from=build /repo/apps/game/dist /app/game/dist

USER node

EXPOSE 3100

CMD ["node", "dist/index.mjs"]
