FROM node:24-slim AS base
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# ── Dependency install ────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY lib/db/package.json lib/db/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY artifacts/api-server/package.json artifacts/api-server/
COPY artifacts/newsroom/package.json artifacts/newsroom/
COPY scripts/package.json scripts/
RUN pnpm install --frozen-lockfile

# ── Build API server ─────────────────────────────────────────
FROM deps AS api-build
COPY . .
RUN pnpm --filter @workspace/api-server run build

# ── Build frontend ───────────────────────────────────────────
FROM deps AS frontend-build
COPY . .
# PORT is required by vite.config.ts — set a default for build time
RUN PORT=3000 pnpm --filter @workspace/newsroom run build

# ── Production image ─────────────────────────────────────────
FROM node:24-slim AS production
WORKDIR /app

# API bundle
COPY --from=api-build /app/artifacts/api-server/dist ./dist
# Runtime node_modules (production deps only — hoisted from workspace root)
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/artifacts/api-server/package.json ./package.json
# Frontend static build — served by Express in production
COPY --from=frontend-build /app/artifacts/newsroom/dist/public ./public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
