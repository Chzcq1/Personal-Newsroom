# SYSTEM_STATUS.md — Active Application Map

**Last updated:** 2026-06-17 (Sprint 21)

---

## Root Cause of Failures (Post-Mortem)

**Issue:** Port conflict between stale custom workflows from Sprint 2 and Replit-managed artifact workflows.

**What happened:**
1. Sprint 2 created two custom workflows — `Start api-server` (port 8080) and `Start newsroom` (port 23519)
2. Replit auto-registered proper artifact workflows when artifacts were catalogued: `artifacts/api-server: API Server` and `artifacts/newsroom: web`
3. Both sets of workflows competed for the same ports
4. `artifacts/newsroom: web` failed to start — port 23519 was held by `Start newsroom` (stale PID 1598)
5. With the frontend down, all topic briefings returned connection errors to the user

**Resolution:**
- Removed `Start api-server` and `Start newsroom` custom workflows
- Killed stale vite process (PID 1598) holding port 23519
- Restarted `artifacts/newsroom: web` — now running correctly

---

## Active Workflows (Only These Should Exist)

| Workflow Name | Command | Port | Purpose |
|---------------|---------|------|---------|
| `artifacts/newsroom: web` | `pnpm --filter @workspace/newsroom run dev` | 23519 | Frontend — user-facing app |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 | Backend API |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | 8081 | Design tool (not user-facing) |

## Removed Workflows (Deprecated)

| Workflow Name | Reason Removed |
|---------------|---------------|
| `Start api-server` | Duplicate of `artifacts/api-server: API Server` — caused port 8080 conflict |
| `Start newsroom` | Duplicate of `artifacts/newsroom: web` — caused port 23519 conflict |

---

## Active Application: Entry Points

### Frontend — Personal AI Newsroom
- **Preview path:** `/` (external port 3000)
- **Internal port:** 23519
- **Artifact:** `artifacts/newsroom`

| Route | Component | Status |
|-------|-----------|--------|
| `/` | Home page — topic selector + intelligence briefing | ACTIVE |
| `/saved` | Saved Briefings list | ACTIVE |

### API Server
- **Preview path:** `/api` (external port 8080)
- **Internal port:** 8080
- **Artifact:** `artifacts/api-server`

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/healthz` | ACTIVE | Basic health check (status: ok) |
| GET | `/api/health` | ACTIVE | Detailed health: AI provider + RSS feeds + timestamp |
| GET | `/api/topics` | ACTIVE | List available topics |
| POST | `/api/news/summarize` | ACTIVE | Fetch + summarize (with failsafe fallback) |

### Design Tool (Not User-Facing)
- **Preview path:** `/__mockup`
- **Internal port:** 8081
- **Artifact:** `artifacts/mockup-sandbox`
- This is a component preview sandbox used for UI design only. Users will not interact with it.

---

## Failsafe Mode

If the AI provider fails after articles are collected, the system no longer shows a blank page or an error. Instead:
- The API returns `failsafeMode: true` with the collected articles
- The frontend displays a "Raw Articles" fallback view (headline, source, date, link)
- Users always see something useful

---

## Known Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| RSS feed outages | Medium | 5-6 sources per topic; 3 can fail before briefing degrades |
| AI provider timeout | Medium | Failsafe mode activates — articles shown even if AI fails |
| GitHub token rate limit | Low | Switch AI_PROVIDER to openai or gemini as fallback |
| Port conflicts from manual workflows | Medium | Never create custom workflows — use Replit artifact system only |
