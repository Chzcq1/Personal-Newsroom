---
name: Workflow Setup
description: Canonical workflow configuration — which workflows should exist and why duplicates are dangerous
---

## Active Workflows (Only These Should Exist)

| Workflow | Command | Port |
|----------|---------|------|
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |
| `artifacts/newsroom: web` | `pnpm --filter @workspace/newsroom run dev` | 23519 |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | 8081 |

## Critical Rule

**Never create custom workflows alongside Replit-managed artifact workflows.** Replit auto-creates a workflow for every registered artifact. Adding a second workflow that binds the same port causes the artifact workflow to fail silently.

**Why:** Sprint 2 created `Start newsroom` (port 23519) and `Start api-server` (port 8080) manually. When Replit registered the artifact workflows they competed for the same ports. `artifacts/newsroom: web` kept failing with "Port 23519 is already in use" — all briefings appeared broken even though the API server was fine.

**How to apply:** When adding a new service, use the artifacts skill to register it. The artifact system creates the workflow automatically with PORT and BASE_PATH injected. Do not run `createWorkflow` separately.

## PORT and BASE_PATH

Replit injects PORT and BASE_PATH automatically into managed artifact workflows. The newsroom vite.config.ts requires both. This works correctly as long as no other process holds the port first.

## Port Conflict Recovery

If a workflow is removed but the port stays bound: the process survived workflow deletion. Use `ss -tlnp | grep <port>` to find the PID and `kill -9 <pid>` to free it. Then restart the artifact workflow.
