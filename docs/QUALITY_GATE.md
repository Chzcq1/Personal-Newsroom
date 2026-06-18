# QUALITY_GATE.md — Sprint QA Checklist

**Created:** Sprint 28 — Product Realignment

---

## Purpose

Every feature shipped must pass this gate. QA Agent must check every item.
A single FAIL blocks the release.

---

## Data Quality

- [ ] Uses REAL data (no mock responses in production paths)
- [ ] No placeholder cards ("Coming soon", "Data loading...", hardcoded values)
- [ ] No fake metrics (invented numbers, hardcoded percentages)
- [ ] No fake trend injection (mocked trending topics)

---

## Navigation & Routes

- [ ] No dead routes (every route renders a real page)
- [ ] No broken redirects (all redirect targets exist)
- [ ] Admin routes NOT accessible from user navigation
- [ ] Admin tools NOT shared with user UX style
- [ ] No duplicate settings pages
- [ ] No broken OAuth flows

---

## Product Alignment

- [ ] Feature is connected to PRODUCT_BRIEF.md vision
- [ ] User instantly understands what the feature does
- [ ] Feature does NOT duplicate existing functionality
- [ ] Feature is NOT an analytics toy
- [ ] Feature is NOT an admin panel masquerading as a user feature

---

## Mobile & Visual

- [ ] Mobile-first layout (max-width container, touch-friendly targets)
- [ ] No admin leakage into user UI
- [ ] Information hierarchy is clear (hook → context → action)

---

## Technical

- [ ] Token cost is justified (AI calls have clear user value)
- [ ] No unnecessary abstraction layers
- [ ] Production deploy compatible (no localhost hardcoding)
- [ ] No unused imports or dead files introduced

---

## QA Agent MUST FAIL BUILD IF:

| Condition | Action |
|-----------|--------|
| Feature is fake / placeholder | FAIL — remove or fix |
| Feature duplicates existing | FAIL — consolidate |
| Route is dead | FAIL — add redirect or real content |
| Data is mock-only | FAIL — wire real data or mark "architecture-ready" |
| Admin tool leaks into user UX | FAIL — separate immediately |
| Token cost unjustified | FAIL — remove AI call or gate behind plan |

---

## "Architecture-Ready" Exception

A feature MAY ship without real data IF:
1. Interface/contract is fully defined in code
2. The feature is visually marked as "coming soon" or hidden
3. Real API integration is documented and planned
4. No fake data is shown to the user

Mark such features: `// ARCHITECTURE-READY: <connector name> API key needed`
