# ARCHITECTURE GUARDRAILS
**Status:** Mandatory reading before Sprint 20+  
**Author:** Sprint 19 consolidation review  
**Purpose:** Prevent architecture drift that created the fragmentation Sprint 19 had to fix

---

## The Problem This Document Solves

Between Sprints 8–18, INFOX accumulated:
- 33 frontend routes (should be ~15 for this product scope)
- 38 documentation files (should be ~6–8)
- 10+ admin dashboards with overlapping data
- 3 Telegram preview tools (Preview, Preview V2, Preview V3)
- 3 debug pages instead of 1 debug center

Every sprint added new pages instead of extending existing ones. This is the failure mode these rules exist to prevent.

---

## Rule 1: Extend, Don't Create

**Before creating any new page, ask:**
> "Does an existing page already handle this conceptually?"

| New feature type | Where it goes |
|---|---|
| Delivery / Telegram feature | `/delivery-studio` (add a tab) |
| Analytics / metrics | `/intelligence-center` (add a section) |
| Debug / diagnostic tool | `/admin/debug` (add a tab) |
| User preference | `/settings` (add a row) |
| New admin system | Document in Intelligence Center first |

**If you must create a new page**, it requires removing an old one or merging two existing ones first.

---

## Rule 2: No Duplicate Dashboards

INFOX has had these duplicates that had to be merged:
- Delivery Analytics + Delivery V2 Analytics + Intelligence Score
- Telegram Preview + Preview Live + Preview V3
- Debug/Relevance + Debug/Entities + Debug/FeedEvolution

**Enforcement:** If two pages show overlapping metrics, merge them. Never ship two dashboards for the same concept.

---

## Rule 3: No Overlapping Previews

There must be exactly ONE preview for each delivery channel:
- Telegram → `/delivery-studio` Preview tab
- Future LINE → a new tab in `/delivery-studio`
- Future Email → a new tab in `/delivery-studio`

**Never create `/delivery-preview-v4` or similar versioned preview pages.**

---

## Rule 4: Route Budget

INFOX must stay under 20 primary routes. Current count after Sprint 19: ~15.

| Tier | Routes | Budget |
|---|---|---|
| Core user | /, /onboarding, /saved, /my-feed, /narratives, /waitlist | 6 |
| Settings | /settings + sub-pages | ≤ 7 |
| Hubs | /delivery-studio, /intelligence-center | 2 |
| Admin | /admin/* | ≤ 5 |
| **Total** | | **≤ 20** |

**If you need route 21, remove route 20 first.**

---

## Rule 5: Documentation Budget

Docs must stay under 10 core files. Everything else belongs in a `docs/archive/` folder.

**Core docs (never archive):**
1. `PROJECT_VISION.md` — product north star
2. `ARCHITECTURE.md` — system overview
3. `DEPLOYMENT_GUIDE.md` — how to deploy
4. `CHANGELOG.md` — sprint history
5. `AGENT_RULES.md` — AI agent constraints
6. `ARCHITECTURE_GUARDRAILS.md` — this file
7. `CLOSED_ALPHA_READINESS_REPORT.md` — user readiness

**Archive candidates (move to `docs/archive/` after sprint):**
- Sprint-specific feature docs (SIGNAL_MODES.md, COMPRESSION_ENGINE.md, etc.)
- These are reference material, not mandatory reading

---

## Rule 6: Admin ≠ User

**User-facing routes** (`/`, `/settings/*`, `/delivery-studio`, `/intelligence-center`):
- Must feel calm and minimal
- No debug output
- No "Sprint X" or "NEW" badges after launch
- No technical jargon
- Readable on mobile

**Admin routes** (`/admin/*`):
- Can expose technical detail
- For developer/operator use only
- Must be linked from settings, not from nav
- Should never appear in primary navigation

**Never mix admin controls into user pages.** If a feature is for developers, it goes under `/admin/`. If it's for users, it goes in `/settings/` or a hub.

---

## Rule 7: No New Services Without Purpose

Sprint 18 created 9 new backend services. Some were necessary; some were speculative architecture.

**Before adding a new service, answer:**
1. Which user action does this enable or improve?
2. Is there an existing service that could be extended instead?
3. Will this be called within the next sprint?

If the answer to #3 is "not immediately", the service is speculative. Document the design in ARCHITECTURE.md instead of building it.

---

## Rule 8: Versioned Services Must Replace, Not Accumulate

`briefingFormatterV3` exists alongside `briefingFormatter` and `briefingFormatterV2`.  
`previewDeliveryV3` exists alongside `previewDelivery` and `previewDeliveryV2`.

**Pattern: When you create V2 of something, delete V1. When you create V3, delete V2.**

If backward compatibility is needed, keep a compatibility shim in the existing file — do not maintain parallel service implementations.

---

## Rule 9: Feature Flags Over Feature Sprawl

Instead of creating parallel flows (e.g., "executive mode" as a separate page), use feature flags within existing flows.

Good: `if (execMode) return executivePrompt(articles)` inside the existing briefing flow  
Bad: Creating `/settings/executive-mode` as a separate page

---

## Rule 10: Sprint Planning Checklist

Before starting any sprint, answer these questions:

- [ ] What existing pages will this sprint's new features go into?
- [ ] Will this sprint increase the route count? If yes, which routes will be removed?
- [ ] Will this sprint add new docs? If yes, which old docs will be archived?
- [ ] Does the feature belong in user UI or admin UI?
- [ ] Are there any existing services this sprint should delete or merge?

**If a sprint adds 5 new routes and removes 0, reject the sprint plan.**

---

## Architectural Patterns to Follow

### Hub Pattern (preferred)
One primary page with tabs for related features.  
Examples: Delivery Studio (5 tabs), Intelligence Center (5 sections), Debug Center (3 tabs)

### Section Pattern (preferred)
One page with clearly labeled sections, all visible on scroll.  
Examples: Settings page, Home feed

### Leaf Page Pattern (acceptable)
A single-purpose page for a deep-dive feature.  
Examples: /settings/interests, /settings/signal-mode  
**Rule:** Leaf pages must be reachable from a hub or settings. Never standalone.

### Dashboard Sprawl (forbidden)
Multiple disconnected pages each showing a subset of the same data.

---

## Current Architecture State (Post Sprint 19)

```
/                          ← Home feed (core user action)
/onboarding                ← First-run setup
/saved                     ← Briefing library
/my-feed                   ← Personalized feed
/narratives                ← Story tracking
/settings                  ← Settings hub
  /settings/interests      ← Leaf: interest profile
  /settings/topics         ← Leaf: topic & source management
  /settings/personality    ← Leaf: briefing tone
  /settings/preferences    ← Leaf: executive mode
  /settings/signal-mode    ← Leaf: signal mode
/delivery-studio           ← Hub: all Telegram functionality
/intelligence-center       ← Hub: all analytics
/admin/economics           ← Admin: token cost visibility
/admin/narratives          ← Admin: narrative management
/admin/efficiency          ← Admin: AI pipeline controls
/admin/debug               ← Admin hub: all debug tools
/insights/export           ← Leaf: shareable cards
```

---

*This document is mandatory reading before planning Sprint 20 and beyond.*  
*It exists because Sprint 19 spent a week fixing fragmentation that accumulated over 10 sprints.*
