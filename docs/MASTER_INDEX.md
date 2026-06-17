# MASTER_INDEX.md — INFOX Documentation Navigator

**Last updated:** 2026-06-17 (Sprint 21)

This is the canonical entry point for all INFOX documentation.
Start here. Everything else is linked from here.

---

## Quick Reference

| I want to… | Go to |
|---|---|
| Understand what INFOX is | [PROJECT_VISION.md](#product) |
| Understand how it's built | [ARCHITECTURE.md](#architecture) |
| Deploy it | [DEPLOYMENT_GUIDE.md](#deployment) |
| Contribute or modify it | [AGENT_RULES.md](#rules) |
| Check system status | [SYSTEM_STATUS.md](#operations) |
| See admin command center | `/admin/command-center` (live) |
| See user insights | `/admin/users` (live) |
| See what changed | [CHANGELOG.md](#history) |
| Understand DB/workers | [PERSISTENT_INFRASTRUCTURE.md](#infrastructure) |
| Understand token economy | [TOKEN_ECONOMY.md](#intelligence) |
| Understand Telegram format | [TELEGRAM_FORMATTING.md](#delivery) |
| Enforce architecture rules | [ARCHITECTURE_GUARDRAILS.md](#guardrails) |
| See what was audited/consolidated | [CONSOLIDATION_AUDIT.md](#consolidation) |
| Find alpha readiness status | [CLOSED_ALPHA_READINESS_REPORT.md](#alpha) |

---

## Active Documentation (12 files)

### Product

**[PROJECT_VISION.md](PROJECT_VISION.md)**
What INFOX is, who it is for, and what it is not.
Read before writing any feature code.

---

### Architecture

**[ARCHITECTURE.md](ARCHITECTURE.md)**
System structure: modules, services, data flow, package layout.
The canonical technical reference.

**[ARCHITECTURE_GUARDRAILS.md](ARCHITECTURE_GUARDRAILS.md)**
10 rules enforced across all sprints.
Route budget ≤ 20. Doc budget ≤ 10. No duplicate systems.

---

### Rules

**[AGENT_RULES.md](AGENT_RULES.md)**
Rules for any AI agent or human contributor making changes.
Must be read before modifying any code.

---

### Infrastructure

**[PERSISTENT_INFRASTRUCTURE.md](PERSISTENT_INFRASTRUCTURE.md)**
PostgreSQL schema (11 tables), repository pattern, 3 background workers,
startup recovery, identity API, anonymous profiles.

**[TOKEN_ECONOMY.md](TOKEN_ECONOMY.md)**
Token budget tiers (DEFAULT/EXECUTIVE/INTELLIGENCE), pressure model,
tokenGovernor service, cost tracking via /admin/economics.

---

### Delivery

**[TELEGRAM_FORMATTING.md](TELEGRAM_FORMATTING.md)**
HTML format spec for Telegram briefings.
Scan-first structure: headline → bullets → body → link.

---

### Deployment

**[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
Full deployment walkthrough for Railway, Fly.io, Render, and VPS.
Includes Docker Compose setup and environment variable reference.

**[SYSTEM_STATUS.md](SYSTEM_STATUS.md)**
Active workflows, known port conflict risks, failsafe mode documentation.

---

### Operations

**[CONSOLIDATION_AUDIT.md](CONSOLIDATION_AUDIT.md)**
Sprint 20 consolidation results: what was merged, deleted, and kept.
Page file audit, route audit, service audit.

**[CLOSED_ALPHA_READINESS_REPORT.md](CLOSED_ALPHA_READINESS_REPORT.md)**
Alpha readiness score (Sprint 19: 4/10), blockers, UX risks.
Updated each sprint until score reaches 7/10.

---

### History

**[CHANGELOG.md](CHANGELOG.md)**
Full sprint history from Sprint 1 to present.
Most recent sprint at the top.

---

## Route Map (Sprint 20 — 12 primary routes)

### User Routes
| Route | Purpose |
|---|---|
| `/` | Topic picker + briefing feed |
| `/onboarding` | 4-step founding member flow |
| `/saved` | Saved briefings library |
| `/my-feed` | Personalised feed |
| `/narratives` | Active story arcs |
| `/waitlist` | Alpha signup |
| `/insights/export` | Export reading insights |
| `/delivery-studio` | Telegram hub (5 tabs) |
| `/intelligence-center` | Intelligence insights (user-facing) |

### Settings Routes
| Route | Purpose |
|---|---|
| `/settings` | Settings hub (6 sections) |
| `/settings/interests` | Interest graph editor |
| `/settings/topics` | Custom topics |
| `/settings/personality` | AI persona |
| `/settings/preferences` | Reading preferences |
| `/settings/signal-mode` | Signal mode (safe/balanced/raw) |

### Admin Routes
| Route | Purpose |
|---|---|
| `/admin/system` | Unified ops dashboard (NEW Sprint 20) |
| `/admin/health` | Real-time health monitor (NEW Sprint 20) |
| `/admin/economics` | Token cost visibility |
| `/admin/narratives` | Narrative management |
| `/admin/efficiency` | Efficiency analytics |
| `/admin/debug` | Debug hub (3 tabs) |

### Auth Routes (Sprint 21)
| Route | Purpose |
|---|---|
| `/auth/login` | Login placeholder (live Sprint 21) |

### Legacy Redirects (permanent, no UI)
Old URLs from Sprints 1–19 redirect to their canonical destinations.
See `App.tsx` for the full list.

---

## Key Architecture Decisions

1. **No zod in api-server** — manual type-guard validation. `@workspace/api-zod` for spec layer.
2. **Graceful degradation** — no DATABASE_URL → in-memory adapters, full API surface maintained.
3. **Repository pattern** — Drizzle never imported directly by business logic.
4. **Anonymous-first identity** — UUID in localStorage, no auth required until Sprint 21.
5. **Persist-before-send** — delivery queue committed to DB before Telegram is called.
6. **Route budget ≤ 20** — adding a route requires retiring one.
7. **Doc budget ≤ 10 active** — sprint-specific docs go to `docs/archive/`.

---

## What's in docs/archive/

29 sprint-specific docs from Sprints 1–18, moved during Sprint 19–20 consolidation.
Do not edit archived docs. Historical reference only.

---

## Sprint Roadmap (summary)

| Sprint | Theme | Key Output |
|---|---|---|
| 1–5 | Foundation | Core briefing pipeline, RSS feeds, AI summarisation |
| 6–10 | Intelligence | Signal scoring, entity memory, narrative clustering |
| 11–13 | Experience | Proactive intelligence, habit engine, Telegram V2 |
| 14 | Infrastructure | PostgreSQL persistence, workers, identity API |
| 15–18 | Precision | Signal priority, strategic context, efficiency layer |
| 19 | Consolidation | 33→15 routes, Delivery Studio, Intelligence Center |
| 20 | Production Prep | Architecture separation, /admin/system, auth foundations |
| 21 | **Auth** | Real authentication, session management, protected routes |
| 22+ | Monetisation | Subscriptions, payment system |
