# Closed Alpha Plan — INFOX

## Goal

Launch INFOX to a small group of real users before public release. Validate the
core intelligence loop (collect → score → summarize → deliver) under real-world
conditions with real Thai-language feedback.

---

## Alpha Scope

### What's ready
- Full intelligence pipeline (13 sprints of development)
- Thai-language AI briefings
- Telegram scheduled delivery (morning 07:00 / evening 18:00)
- Personalization via interest profiles and taste learning
- Narrative tracking and entity memory
- Anonymous persistent identity
- Platform Economics dashboard

### What's NOT in alpha
- Account login / password auth
- Payments / subscriptions
- Custom source subscriptions
- Multi-language support

---

## Founding Member Architecture

### DB Fields (in `user_profiles`)
```sql
founding_member      BOOLEAN DEFAULT false
onboarding_completed BOOLEAN DEFAULT false
```

### Designation Flow
1. User visits `/onboarding`
2. Completes 4-step onboarding
3. On completion: `POST /api/identity/:id/onboarding` with `foundingMember: true`
4. DB sets `founding_member = true` on their profile
5. Badge displayed in UI (future: special features unlocked)

### Founding Member Benefits (planned)
- Early access to new intelligence features
- Direct feedback channel to the team
- Preserved profile when full auth is added
- Recognition in UI (badge, special mention)

---

## Alpha Launch Steps

### Phase 1 — Internal (Now)
- [ ] Deploy to Railway/Render/Fly.io
- [ ] Verify full pipeline end-to-end on production
- [ ] Set up Telegram bot for alpha users
- [ ] Verify DB persistence across restarts

### Phase 2 — Invited Users (5-10 people)
- [ ] Share direct link with invite context
- [ ] Ask users to complete onboarding
- [ ] Monitor `/admin/economics` for usage
- [ ] Collect feedback via Telegram / form

### Phase 3 — Feedback Loop (2-4 weeks)
- [ ] Review feedback actions in DB
- [ ] Identify most-used topics
- [ ] Identify delivery reliability issues
- [ ] Prioritize Sprint 15 based on real usage

### Phase 4 — Preparation for Broader Access
- [ ] Add invite code system (optional gating)
- [ ] Add account login (Replit Auth)
- [ ] Migrate anonymous profiles to accounts
- [ ] Consider subscription model

---

## Metrics to Track

| Metric | Target | Source |
|--------|--------|--------|
| Weekly active users | ≥3 in first week | `/api/economics/users` |
| Delivery success rate | ≥95% | `/api/economics/summary` |
| Onboarding completion rate | ≥80% | `user_profiles.onboarding_completed` |
| Cost per user/month | <$1 | `/api/economics/summary` |
| AI quality (subjective) | Good | Direct user feedback |

---

## Feedback Collection

Short-term: Telegram group for alpha users  
Medium-term: In-app feedback (thumbs up/down already instrumented)  
Long-term: `/admin/habit` analytics to understand usage patterns

---

## Invite Architecture (Preparation)

Not implemented yet, but schema-ready:

```sql
-- Future: add to user_profiles
invite_code TEXT UNIQUE
invited_by  TEXT  -- profile_id of referrer
```

For alpha, access is open but unadvertised (security by obscurity).

---

## Known Risks

1. **AI cost spike** — Multiple users generating briefings simultaneously could
   spike token costs. Mitigation: briefing cache (60m TTL) prevents duplicate generation.
2. **Telegram rate limits** — Telegram limits bots to 30 messages/sec. For alpha
   scale this is fine; at 100+ users sending simultaneously, add a rate limiter.
3. **Cold starts** — On free-tier platforms, server may sleep. Workers will catch
   up on missed deliveries via the queue on next wake.
