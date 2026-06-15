---
name: Workflow Setup
description: Canonical workflow configuration — which workflows should exist and why duplicates are dangerous
---

## Active Workflows (Only These Should Exist)

| Workflow | Command | Port |
|----------|---------|------|
| `Start API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |
| `Start Newsroom Frontend` | `PORT=3000 BASE_PATH=/ pnpm --filter @workspace/newsroom run dev` | 3000 |

> Note: The artifact registration system showed no registered artifacts (listArtifacts returned []).
> Workflows are managed manually via configureWorkflow() with explicit env vars.

## Critical Startup Requirements

**API server** needs `PORT=8080` — env.ts throws if PORT is unset.

**Newsroom Vite** needs both `PORT=3000` AND `BASE_PATH=/` — vite.config.ts throws if either is unset.
The external preview port is 3000 (maps to Replit external port 3000 via .replit [[ports]]).

## API Route Prefix

All API routes are mounted under `/api` in app.ts. Route names in individual router files are relative:
- `health.ts` → `/api/health`
- `topics.ts` → `/api/topics` (NOT `/api/news/topics`)
- `news.ts` → `/api/news/summarize`
- `costs.ts` → `/api/admin/costs`
- `feed.ts` → `/api/feed/personal`

## Critical Rule

**Never create custom workflows alongside Replit-managed artifact workflows.** Replit auto-creates a workflow for every registered artifact. Adding a second workflow that binds the same port causes the artifact workflow to fail silently.

**Why:** Sprint 2 created `Start newsroom` (port 23519) and `Start api-server` (port 8080) manually. When Replit registered the artifact workflows they competed for the same ports. `artifacts/newsroom: web` kept failing with "Port 23519 is already in use" — all briefings appeared broken even though the API server was fine.

## Port Conflict Recovery

If a workflow is removed but the port stays bound: the process survived workflow deletion. Use `ss -tlnp | grep <port>` to find the PID and `kill -9 <pid>` to free it. Then restart the workflow.
