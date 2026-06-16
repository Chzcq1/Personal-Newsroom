# CLOSED ALPHA READINESS REPORT
**Generated:** Sprint 19 — June 2026  
**Status:** Pre-alpha — suitable for founder-only testing

---

## Executive Summary

INFOX has built a technically sophisticated AI newsroom with impressive intelligence infrastructure. However, it is **not yet ready for closed alpha** with external users. The product currently feels like a developer control panel, not a calm intelligence product. This report identifies what must be done before inviting the first 10 users.

**Readiness Score: 4/10**  
*Technically sound. Product experience needs focused work.*

---

## Critical Blockers (Must fix before any external user)

### B1 — Navigation is overwhelming
**Risk: High**  
Even post-Sprint 19 consolidation, new users face 6+ pages in settings and multiple entry points. The primary action (get a briefing) is buried.  
**Fix:** Home page should have ONE clear action. Settings should be secondary.

### B2 — Onboarding doesn't explain the product
**Risk: High**  
The 4-step onboarding collects topic preferences but never shows a sample briefing. Users don't know what they're signing up for until after setup.  
**Fix:** Show a sample Thai briefing in step 2 so users understand the product before committing.

### B3 — No Telegram = no product for most users
**Risk: High**  
Without Telegram credentials, users have no delivery mechanism. The fallback web feed exists but isn't prominently positioned as viable.  
**Fix:** Either (a) make the web feed feel just as complete, or (b) make Telegram setup unavoidable in onboarding.

### B4 — Thai output quality is inconsistent
**Risk: High**  
Some AI outputs mix English and Thai unpredictably. The Thai Localization Engine (Sprint 18) detects this but doesn't automatically retry.  
**Fix:** Wire thaiLocalizationEngine.analyzeThaiRatio() into the delivery pipeline and re-prompt if ratio < 0.7.

---

## UX Risks (Fix before expanding to 10+ users)

### U1 — Feed feels empty on first visit
The home feed shows nothing until the user manually requests a briefing. New users may think the product is broken.  
**Recommendation:** Auto-generate a sample briefing on first visit using the user's selected topics.

### U2 — Mobile readability
Signal cards and briefing text are readable but buttons are too small on phones (< 44px touch targets in some places).  
**Recommendation:** Sprint 19 CSS adds touch target improvements — verify on iOS Safari.

### U3 — No clear "done" state after delivery setup
After saving Telegram credentials, users see a generic "Settings saved" toast. They don't know if delivery is now active.  
**Recommendation:** Show a clear confirmation with expected delivery times (07:00 and 18:00 ICT).

### U4 — Too many "NEW" badges
Multiple admin features still show "NEW" badges, reinforcing the developer dashboard feeling.  
**Recommendation:** Remove all "NEW" and "Sprint X" labels from user-facing UI.

### U5 — Settings still feels long
Even after Sprint 19 restructure, the settings page has 9 visible items. For a personal newsroom, most users need 3: topics, delivery, personality.  
**Recommendation:** Collapse advanced/admin items behind an "Advanced" disclosure by default.

---

## Infrastructure Risks

### I1 — Server-side Telegram scheduling requires Replit Secrets
Scheduled delivery only works with `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Replit environment secrets. User-configured browser tokens are not used for scheduled delivery.  
**Status:** This is by design (security). Document it clearly in onboarding.  
**Risk:** Medium — users will expect the app to use their configured credentials.

### I2 — In-memory state lost on restart
All intelligence state (entity memory, narrative tracking, interest graphs) is in-memory. A Replit restart wipes 14 days of context.  
**Status:** Sprint 14 DB schema exists. Sprint 19 should wire intelligence state to PostgreSQL.  
**Risk:** High for multi-day users. Acceptable for alpha (single user, controlled restarts).

### I3 — No rate limiting on AI endpoints
`/api/news/summarize` has no rate limiting. A user could accidentally trigger hundreds of AI calls.  
**Fix:** Add per-IP rate limiting (5 req/min) before opening to external users.

### I4 — GitHub token exposed if cloned
The `GITHUB_TOKEN` environment variable (used for GitHub AI Models) must never be committed. Confirm `.env` is in `.gitignore`.  
**Risk:** Low (Replit Secrets are isolated), but verify before any public-facing deployment.

---

## Deployment Risks

### D1 — No production health monitoring
The `/api/health` endpoint exists but no alerting is configured. If the Replit app sleeps or crashes, there's no notification.  
**Recommendation:** Add Uptime Robot or Replit's built-in deployment monitoring.

### D2 — Replit sleep kills scheduled delivery
Free-tier Replit projects sleep after inactivity. Scheduled 07:00/18:00 delivery may miss if no requests precede it.  
**Fix:** Deploy using `replit deploy` (always-on) before promising scheduled delivery to users.

### D3 — Database backup
PostgreSQL state has no backup strategy. A database corruption event would lose all user preferences and delivery history.  
**Recommendation:** Enable Replit DB automatic backups or export weekly.

---

## Monetization Readiness

**Score: 1/10**  
- BYOK architecture is designed (Sprint 18) but not implemented
- No payment infrastructure exists
- No subscription tiers defined
- Token economics are tracked but not exposed to users in a value-framing way

**Pre-monetization checklist:**
- [ ] BYOK with OpenAI key validation working
- [ ] Clear free vs. paid tier definition
- [ ] Token usage visible to user (not just admin)
- [ ] Payment integration (Stripe or Whop)
- [ ] User authentication required for subscription

---

## Recommended Stabilization Priorities (Before Closed Alpha)

**Sprint 20 — Minimum Viable Product Polish:**

1. **Wire Thai localization enforcement** — auto-retry if Thai ratio < 0.7
2. **Onboarding sample briefing** — show real AI output in step 2
3. **First-visit auto-briefing** — seed the home feed on first load
4. **Remove ALL "NEW" / sprint badges** from user-facing UI
5. **Delivery confirmation UX** — show "You'll receive briefings at 07:00 and 18:00 ICT"
6. **Rate limiting** on `/api/news/summarize`
7. **Deploy to always-on** before inviting first external user
8. **Mobile touch target audit** — verify 44px minimum on iOS

**Sprint 21 — Closed Alpha Ready:**
- User authentication (even simple email/magic link)
- BYOK working for OpenAI
- DB-persisted intelligence state
- Basic health monitoring

---

## What's Working Well

- Core briefing generation is reliable and fast (< 10s)
- Thai output quality is good when the AI cooperates
- Telegram delivery works end-to-end
- Topic system is flexible (built-in + custom RSS)
- Signal intelligence is sophisticated (entity tracking, narrative evolution)
- Token costs are very low (< $0.01/day at current usage)
- Settings architecture is now cleaner after Sprint 19

---

*This report was generated as part of Sprint 19 Task K.*  
*Update before each alpha expansion milestone.*
