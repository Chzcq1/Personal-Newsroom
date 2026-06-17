---
name: Sprint 19 Consolidation
description: Route reduction (33→15), page merges, docs archive, guardrails established for closed alpha prep
---

## Rule: React hooks must never be called inside `.map()`

Extract any component that needs `useState`/`useEffect` within a list render into its own named function component. The `SlotCard` pattern in `delivery-studio.tsx` is the canonical example.

**Why:** JSX inside `.map()` is not a component — hooks called there violate the Rules of Hooks and will cause runtime errors or silent state bugs.

**How to apply:** If a list item needs local state or side effects, define `function ItemCard({ ... }) { const [s] = useState(...); ... }` above the parent and render `<ItemCard key={...} ... />` inside the map.

## Rule: `addSlot()` requires a `label` argument (4th positional param)

`addSlot(settings, hour, minute, label, daysFilter?)` — label is required, not optional. Generate it as `HH:MM Briefing` when auto-creating.

**Why:** The function signature has `label: string` (not `label?: string`), so calling with 3 args causes a TS2554 error.

## Route budget is ≤ 20 (enforced by ARCHITECTURE_GUARDRAILS.md)

As of Sprint 19, the app has 15 primary routes. Adding any new route requires retiring one or merging into an existing hub page.

## Page merge hubs (as of Sprint 19)

| Hub | What it replaces |
|---|---|
| `/delivery-studio` | 6 Telegram/scheduler pages |
| `/intelligence-center` | 7 analytics/admin pages |
| `/admin/debug` | 3 debug pages |
| `/admin/economics` | absorbed `/admin/costs` |

## Docs: `docs/archive/` holds 29 retired sprint-specific docs

Do not edit files in `docs/archive/`. Core docs that remain active: `ARCHITECTURE.md`, `CHANGELOG.md`, `DEPLOYMENT_GUIDE.md`, `ARCHITECTURE_GUARDRAILS.md`, `CLOSED_ALPHA_READINESS_REPORT.md`, `AGENT_RULES.md`, `PROJECT_VISION.md`, `PERSISTENT_INFRASTRUCTURE.md`, `SYSTEM_STATUS.md`, `TELEGRAM_FORMATTING.md`, `TOKEN_ECONOMY.md`.
