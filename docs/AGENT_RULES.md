# AGENT_RULES.md — Personal AI Newsroom V1

Rules for any AI agent (Replit Agent, Cursor, Copilot, Claude, etc.) making changes to this codebase.

**These rules exist to protect a living, daily-use product from unintended side effects.**

---

## Before You Touch Any Code

You MUST read and understand:

1. `docs/PROJECT_VISION.md` — What this product is, what it is NOT, and who it is for
2. `docs/ARCHITECTURE.md` — How the system is structured and how modules connect
3. `docs/AGENT_RULES.md` — This file — the rules of engagement

**Do not write a single line of code until these three files have been read.**

---

## Code Modification Rules

### Before Editing

- Identify every file that will be affected
- Explain in plain language WHY the change is necessary
- Check for dependencies — what calls this function? What does it import?
- Confirm the change aligns with `PROJECT_VISION.md`

### While Editing

- Make the smallest change that solves the problem
- Do not refactor unrelated code in the same commit
- Do not rename variables or functions without a clear reason
- Keep existing interfaces intact unless explicitly changing them

### After Editing

- Verify the original functionality still works
- Verify no duplicate logic was introduced
- Verify no unused files were created
- Verify `ARCHITECTURE.md` is still accurate — update it if not

---

## No Rewrite Policy

**Never rewrite entire files unless absolutely necessary.**

Prefer:
- Small modifications
- Component-level updates
- Function-level changes

If you believe a full rewrite is needed, stop and explain why before proceeding. The cost of a rewrite is always higher than it appears.

Avoid replacing working code with "cleaner" code that has equivalent behavior — this introduces risk with no functional gain.

---

## File Organization Rules

The folder structure defined in `ARCHITECTURE.md` is the law.

| Concern | Location |
|---------|----------|
| Pages and UI | `frontend/pages/`, `frontend/components/` |
| API routing | `backend/routes/` |
| Request handling | `backend/controllers/` |
| Business logic | `services/` |
| News collection | `services/news/` |
| AI summarization | `services/ai/` |
| Delivery (Telegram, etc.) | `services/delivery/` |
| Database models | `database/models/` |
| Environment config | `config/env.js` |
| Documentation | `docs/` |

**Do not place business logic in controllers.**
**Do not place API calls in frontend components.**
**Do not read `process.env` directly — always use `config/env.js`.**

---

## V1 Scope Enforcement

V1 intentionally excludes certain features. If a task would require implementing any of the following, stop and ask for confirmation:

- User authentication or user accounts
- Payment or subscription logic
- Marketplace or agent store
- Gamification (points, badges, streaks)
- Multi-user support
- Admin panel

These belong to future versions. Do not scope-creep V1.

---

## Memory Documentation Rule

Whenever a **major feature** is added or significantly changed, you MUST update `docs/ARCHITECTURE.md`:

- Add or update the module description
- Update the API endpoints table if routes changed
- Update the Important Files section if risk changed
- Update environment variables table if new vars are needed

This is not optional. Architecture drift is how projects become unmaintainable.

---

## If You Are Unsure

**Do not code immediately.**

If any of the following apply:
- The requirement is ambiguous
- The change would affect more than 3 files
- The change touches a HIGH-risk file (see ARCHITECTURE.md)
- The feature was explicitly excluded from V1

**Stop. Ask a clarifying question first.**

Implementing the wrong thing quickly is worse than implementing the right thing slowly.

---

## Critical File Risk Levels

These files carry HIGH risk. Any change to them requires explicit review:

| File | Risk | Why |
|------|------|-----|
| `services/ai/summaryService.js` | HIGH | Core product feature — AI summary in Thai |
| `services/news/newsApiService.js` | HIGH | Quota-sensitive, key-dependent |
| `config/env.js` | HIGH | All services depend on this |
| `backend/routes/` | MEDIUM | Frontend depends on these paths |
| `services/news/rssService.js` | MEDIUM | Changing feed URLs breaks coverage |

---

## Changelog Rule

Every meaningful change must be recorded in `docs/CHANGELOG.md` with:

- Date
- What changed
- Why it changed
- Files affected

Format:

```
## [YYYY-MM-DD] — Short description

**What:** Description of the change
**Why:** Reason for the change
**Files:** List of modified files
```

---

## Summary

| Rule | Short Form |
|------|-----------|
| Read 3 docs before coding | Vision → Architecture → Rules |
| Smallest change wins | No rewrites, no refactors without reason |
| Structure is law | Files go where ARCHITECTURE.md says |
| V1 scope is frozen | Don't add excluded features |
| Update ARCHITECTURE.md | After every major change |
| Ask when unsure | Never guess on ambiguous requirements |
