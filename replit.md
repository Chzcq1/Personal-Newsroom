# Personal AI Newsroom V1 (INFOX)

A web application that lets users select news topics and receive AI-generated briefings in Thai — delivered as a personal newsroom, not a generic news site. Sprint 14 introduced full PostgreSQL persistence, a durable delivery queue, background workers, anonymous identity, and deployment-ready infrastructure.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080 in dev)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (server degrades to in-memory if absent)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, port 8080
- DB: PostgreSQL + Drizzle ORM (11 tables — see `lib/db/src/schema/`)
- Validation: manual type-guards in routes (zod is NOT installed in `@workspace/api-server` — use `@workspace/api-zod` for shared schemas)
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (ESM bundle via `build.mjs`)

## Where things live

| Area | Path |
|---|---|
| DB schema (source of truth) | `lib/db/src/schema/index.ts` |
| Storage abstraction | `artifacts/api-server/src/services/storage/` |
| Repositories | `artifacts/api-server/src/repositories/` |
| API routes | `artifacts/api-server/src/routes/` |
| Background workers | `artifacts/api-server/src/workers/` |
| Frontend pages | `artifacts/newsroom/src/pages/` |
| Deployment configs | `deployment/` |
| Docs | `docs/` |

## Architecture decisions

1. **No zod in api-server** — `@workspace/api-server` has no `zod` dependency. Routes use manual type-guard validation. `@workspace/api-zod` holds shared Zod schemas for the spec layer only.
2. **Graceful degradation** — if `DATABASE_URL` is absent, the server switches to in-memory adapters automatically. No crash, full API surface.
3. **Repository pattern** — all DB access goes through `*Repository.ts` files. Drizzle is never imported directly by business logic.
4. **Workers are isolated** — each worker tick is wrapped in try/catch; one failing worker cannot kill others.
5. **Identity is anonymous-first** — profiles keyed on client UUID from localStorage; no auth required.
6. **Persist-before-send** — delivery queue entry is committed to DB before Telegram is called.

## Product

INFOX delivers Thai-language AI news briefings on demand and on schedule. Users pick topics (AI, Technology, Stocks, Economy, Politics — plus custom), the server fetches live RSS feeds, an AI provider (GitHub Models / OpenAI) summarises them in Thai, and briefings can be delivered via Telegram. The system tracks reading habits, story narratives, entity memory, and user preferences, adapting briefings over time.

**Key user-facing pages:**
- `/` — topic picker + briefing feed
- `/saved` — saved briefings library
- `/settings` — delivery settings, personality, custom topics
- `/onboarding` — 4-step founding-member signup
- `/admin/economics` — token cost visibility
- `/admin/delivery` — delivery analytics
- `/narratives` — active story arcs
- `/insights` — reading trends

## User preferences

_Populate as the user provides explicit instructions._

## Gotchas

- **Never import `zod/v4` in `@workspace/api-server`** — esbuild cannot resolve the `zod/v4` subpath because zod is not installed there. Use manual validation or install zod first.
- **API server port is 8080**, not 5000. The `web` workflow runs on 23519.
- **Two active workflows only**: `artifacts/api-server: API Server` (port 8080) and `web` (port 23519). The old `API Server` and `artifacts/newsroom: web` workflows will always conflict — this is expected.
- **DB push before new tables are usable**: after adding Drizzle schema files, run `pnpm --filter @workspace/db run push` before starting the server.
- **Stale pnpm processes**: if a workflow port is "already in use" after deletion, kill the stale process by PID.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- DB schema: `lib/db/src/schema/index.ts` exports all 11 tables
- API contract: `lib/api-spec/openapi.yaml` (source of truth for generated hooks)
- Deployment guide: `docs/DEPLOYMENT_GUIDE.md`
- Sprint history: `docs/CHANGELOG.md`
- Architecture deep-dive: `docs/ARCHITECTURE.md`
