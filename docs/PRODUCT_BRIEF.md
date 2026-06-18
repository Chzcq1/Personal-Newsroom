# PRODUCT_BRIEF.md — INFOX Product Identity

**Created:** Sprint 28 — Product Realignment

---

## INFOX IS NOT

- An AI newspaper
- An RSS reader
- A generic news dashboard
- An enterprise admin panel
- A random collection of analytics toys

---

## INFOX IS

**A personalized trend intelligence platform.**

Users receive trends and information they care about — before everyone else.

---

## Core Idea

```
Open app
  → instantly see personalized trend feed
  → interact (like, pass, follow, save)
  → algorithm learns your taste
  → Telegram delivers important updates
```

---

## Target Users

| User Type | What They Want |
|-----------|---------------|
| Traders | Market moves before they're mainstream |
| Crypto users | On-chain signals, sentiment shifts, protocol news |
| Creators | Trending topics to create content about |
| Startup founders | Funding news, competitor moves, market signals |
| Researchers | Early signal detection across domains |
| Trend watchers | Viral content, cultural moments, rising topics |
| Drama followers | Social narratives, controversies, public figures |

---

## Core Experience

1. **Open** — immediately see a personalized feed, no loading screen of doom
2. **Scan** — cards are fast, visual, hook-driven (not newspaper paragraphs)
3. **Interact** — like/pass teaches the algorithm; save for later
4. **Discover** — every 6–8 posts, inject adjacent interests
5. **Deliver** — Telegram sends the most important signals automatically

---

## Core Data Sources

### Active (currently implemented)
- Reddit (real discussions, community sentiment)
- Google News (mainstream signal confirmation)
- RSS (curated feeds from Tier A/B/C sources)
- GitHub Trending (tech/dev signals)

### Architecture-Ready (interface defined, API key needed)
- YouTube (trend acceleration via upload velocity)
- Google Trends (search momentum)
- Twitter/X (real-time signal, viral detection)
- TikTok (consumer trend signals)

### Planned
- Instagram, Facebook (reach confirmation)

---

## Feed Ranking Priority

The system MUST prioritize:

| Priority | Signal | Description |
|----------|--------|-------------|
| 1 | Momentum | How fast is this accelerating? |
| 2 | Virality | Cross-platform appearance count |
| 3 | User match | Does this match the user's interests? |
| 4 | Recency | How fresh is this? |
| 5 | Source quality | Tier A sources score higher |

**NOT prioritized:** Generic breaking news with no personalization signal.

---

## Momentum Labels

Every item in the feed MUST have a momentum state:

| Label | Meaning |
|-------|---------|
| 🔥 Exploding | Viral acceleration — top 5% velocity |
| 📈 Rising | Growing attention — above average velocity |
| ➡️ Stable | Steady coverage, no acceleration |
| 📉 Fading | Declining attention — coverage dropping |

---

## Discovery Injection Rule

Every 6–8 posts in the feed: inject one item from an adjacent interest.

**Example:**
- User follows: crypto
- Injected: AI agents (because crypto + AI overlap in DeFi)
- Injected: NVIDIA (because GPU demand drives both AI and crypto mining)
- Injected: startup funding (because crypto projects raise venture rounds)

---

## Anti-Patterns (DO NOT BUILD)

- New dashboards for their own sake
- Admin analytics visible to regular users
- Duplicate feeds or topic selectors
- Fake trend injection (mocked data)
- Enterprise-style interfaces
- Features that require explanation to understand
