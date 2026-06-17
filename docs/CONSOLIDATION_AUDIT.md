# CONSOLIDATION_AUDIT.md — Sprint 20

**Last updated:** 2026-06-17
**Sprint:** 20 — System Consolidation & Production Preparation

---

## Summary

| Category | Before Sprint 20 | After Sprint 20 |
|---|---|---|
| Frontend routes | 15 (post Sprint-19) | 12 |
| Page files on disk | 38 | 20 |
| Admin pages | 8 | 3 (/admin/system, /admin/health, /admin/economics) |
| Telegram pages | 1 (/delivery-studio) | 1 (unchanged) |
| Dead files | 16 | 0 |
| Docs | 11 active | 12 active (+ MASTER_INDEX) |
| Layouts | 0 (flat) | 2 (UserLayout, AdminLayout) |

---

## Page File Audit

### DELETED — Dead files from Sprint-19 de-routing

These files were de-routed in Sprint 19 (removed from App.tsx routes) but never deleted from disk.

| File | Reason |
|---|---|
| `settings/delivery.tsx` | Merged into `/delivery-studio` in Sprint 19 |
| `settings/delivery-debug.tsx` | Merged into `/delivery-studio` (Diagnostics tab) |
| `settings/delivery-preview-live.tsx` | Merged into `/delivery-studio` (Preview tab) |
| `settings/delivery-preview-v3.tsx` | Merged into `/delivery-studio` (Preview tab) |
| `settings/scheduler.tsx` | Merged into `/delivery-studio` (Schedule tab) |
| `settings/intelligence-score.tsx` | Merged into `/intelligence-center` |
| `admin/analytics.tsx` | Merged into `/intelligence-center` |
| `admin/delivery.tsx` | Merged into `/intelligence-center` |
| `admin/feed-quality.tsx` | Merged into `/intelligence-center` |
| `admin/habit.tsx` | Merged into `/intelligence-center` |
| `admin/source-trust.tsx` | Merged into `/intelligence-center` |
| `admin/system-intelligence.tsx` | Merged into `/intelligence-center` |
| `admin-costs.tsx` | Merged into `/admin/economics` |
| `delivery-preview.tsx` | Merged into `/delivery-studio` |
| `debug/entities.tsx` | Merged into `/admin/debug` |
| `debug/feed-evolution.tsx` | Merged into `/admin/debug` |
| `debug/relevance.tsx` | Merged into `/admin/debug` |

### DELETED — Legacy redirect imports in App.tsx

Sprint 19 kept legacy page imports for backward compatibility. Sprint 20 replaces these with proper wouter `<Redirect>` components, removing the dead import chain.

### KEPT — Active pages

| Page | Route | Purpose |
|---|---|---|
| `home.tsx` | `/` | Topic picker + briefing feed |
| `saved-briefings.tsx` | `/saved` | Saved briefings library |
| `my-feed.tsx` | `/my-feed` | Personalised feed |
| `narratives.tsx` | `/narratives` | Narrative arcs |
| `waitlist.tsx` | `/waitlist` | Alpha signup |
| `onboarding.tsx` | `/onboarding` | 4-step founding member |
| `not-found.tsx` | `*` | 404 |
| `delivery-studio.tsx` | `/delivery-studio` | Telegram hub (5 tabs) |
| `intelligence-center.tsx` | `/intelligence-center` | User intelligence insights |
| `settings/index.tsx` | `/settings` | Settings hub |
| `settings/interests.tsx` | `/settings/interests` | Interest graph |
| `settings/topics.tsx` | `/settings/topics` | Custom topics |
| `settings/personality.tsx` | `/settings/personality` | AI persona |
| `settings/preferences.tsx` | `/settings/preferences` | Reading preferences |
| `settings/signal-mode.tsx` | `/settings/signal-mode` | Signal mode |
| `admin/economics.tsx` | `/admin/economics` | Token cost visibility |
| `admin/narratives.tsx` | `/admin/narratives` | Narrative admin |
| `admin/efficiency.tsx` | `/admin/efficiency` | Efficiency admin |
| `admin/debug.tsx` | `/admin/debug` | Debug hub (3 tabs) |
| `admin/system.tsx` | `/admin/system` | **NEW** Unified ops dashboard |
| `admin/health.tsx` | `/admin/health` | **NEW** Real-time health monitor |
| `insights/export.tsx` | `/insights/export` | Insights export |
| `auth/login.tsx` | `/auth/login` | **NEW** Auth placeholder |

---

## Service / Route Audit (API Server)

### KEEP — All production routes

| Route file | Status | Notes |
|---|---|---|
| `health.ts` | KEEP | Core health endpoint |
| `topics.ts` | KEEP | Topic registry |
| `news.ts` | KEEP | Briefing summarise |
| `delivery.ts` | KEEP | Delivery engine |
| `telegram.ts` | KEEP | Telegram delivery |
| `economics.ts` | KEEP | Token cost tracking |
| `identity.ts` | KEEP | Anonymous identity |
| `analytics.ts` | KEEP | Usage analytics |
| `preferences.ts` | KEEP | User preferences |
| `signalMode.ts` | KEEP | Signal mode |
| `narratives.ts` | KEEP | Narrative tracking |
| `waitlist.ts` | KEEP | Alpha waitlist |
| `efficiencyAdmin.ts` | KEEP | Efficiency admin |
| `adaptive.ts` | KEEP | Adaptive intelligence |
| `debug.ts` | KEEP | Debug endpoints |

### REVIEW — Possible overlap

| Route file | Status | Notes |
|---|---|---|
| `costs.ts` | MERGE → `economics.ts` | Duplicated cost logic |
| `sprint18Admin.ts` | REVIEW | May contain sprint-specific endpoints |
| `systemIntelligence.ts` | KEEP | System health data |
| `alerts.ts` | KEEP | Alert system |
| `habit.ts` | KEEP | Habit tracking |
| `feed.ts` | KEEP | Feed collection |
| `feedQuality.ts` | KEEP | Feed quality |
| `knowledgeCompound.ts` | KEEP | Knowledge metrics |
| `multimodal.ts` | KEEP | Multi-source |
| `proactiveIntelligence.ts` | KEEP | Proactive system |

---

## Telegram System Audit

**Status: UNIFIED** (completed Sprint 19)

| Before | After |
|---|---|
| `/settings/delivery` | → `/delivery-studio` (Config tab) |
| `/settings/delivery/debug` | → `/delivery-studio` (Diagnostics tab) |
| `/settings/delivery/preview-live` | → `/delivery-studio` (Preview tab) |
| `/settings/delivery/preview-v3` | → `/delivery-studio` (Preview tab) |
| `/settings/scheduler` | → `/delivery-studio` (Schedule tab) |

One entry point. One formatter pipeline. One delivery status model. ✅

---

## Admin Dashboard Audit

**Sprint 19 merged 7 admin pages → `/intelligence-center`.**
**Sprint 20 adds `/admin/system` for operational visibility.**

| Before | After |
|---|---|
| `/admin/analytics` | → `/intelligence-center` |
| `/admin/delivery` | → `/intelligence-center` |
| `/admin/feed-quality` | → `/intelligence-center` |
| `/admin/system-intelligence` | → `/intelligence-center` |
| `/admin/source-trust` | → `/intelligence-center` |
| `/settings/intelligence-score` | → `/intelligence-center` |
| `/admin/habit` | → `/intelligence-center` |
| `/admin/costs` | → `/admin/economics` |
| `/admin/efficiency` | KEPT (specific enough) |
| `/admin/narratives` | KEPT (specific enough) |
| `/admin/debug` | KEPT as debug hub |
| `/admin/system` | **NEW** — runtime health ops |
| `/admin/health` | **NEW** — real-time API health |

---

## Documentation Audit

### ACTIVE (11 + new Sprint 20 docs)

| Doc | Purpose |
|---|---|
| `CHANGELOG.md` | Sprint history |
| `ARCHITECTURE.md` | System architecture |
| `AGENT_RULES.md` | Contribution rules |
| `PROJECT_VISION.md` | Product vision |
| `DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `PERSISTENT_INFRASTRUCTURE.md` | DB + worker docs |
| `SYSTEM_STATUS.md` | Workflow status |
| `TELEGRAM_FORMATTING.md` | Telegram format spec |
| `TOKEN_ECONOMY.md` | Token budget system |
| `ARCHITECTURE_GUARDRAILS.md` | 10 architecture rules |
| `CLOSED_ALPHA_READINESS_REPORT.md` | Alpha readiness |
| `CONSOLIDATION_AUDIT.md` | **This file** |
| `MASTER_INDEX.md` | **NEW** — docs navigator |

### ARCHIVED (29 sprint-specific docs in docs/archive/)

All sprint-specific docs from Sprints 1–18 moved to `docs/archive/`.
Do not edit archived docs. They exist for historical reference only.

---

## Decisions

1. **`/intelligence-center` stays as user-facing insights** — it shows intelligence quality metrics that regular users can act on (signal mode, compound rate, source health).
2. **`/admin/system` is ops-only** — token pressure, worker health, degradation state, queue depths. Operators only.
3. **`/admin/health` is the liveness check** — simple real-time API/worker health for deployment monitoring.
4. **Legacy URL redirects** — removed from App.tsx imports; replaced with wouter `<Redirect>` to avoid dead code import chains.
5. **UserLayout/AdminLayout** — admin pages get sidebar chrome; user pages keep the current compact nav.
