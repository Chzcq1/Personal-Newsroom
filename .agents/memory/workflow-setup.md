---
name: Workflow Setup
description: Correct workflow commands for api-server and newsroom; env vars required at start
---

Both workflows require explicit env vars — they are NOT set automatically by the Replit artifact system in dev mode.

**api-server:**
- Command: `cd artifacts/api-server && PORT=8080 pnpm run dev`
- waitForPort: 8080
- outputType: "console"
- Requires: PORT (env.ts throws if missing)

**newsroom:**
- Command: `cd artifacts/newsroom && PORT=23519 BASE_PATH=/newsroom/ pnpm run dev`
- waitForPort: 23519
- outputType: "webview"
- Requires: PORT and BASE_PATH (vite.config.ts throws if either is missing)

**Why:** env.ts calls requireEnv("PORT") at module load time; vite.config.ts throws if BASE_PATH is unset.

**How to apply:** Always pass PORT and BASE_PATH explicitly in the workflow command string.
