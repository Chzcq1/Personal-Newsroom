---
name: Onboarding Gate
description: How first-visit detection and onboarding redirect work in my-feed.tsx
---

**Gate mechanism** (in `my-feed.tsx` `MyFeedPage`):
```js
const onboarded = localStorage.getItem("ai-newsroom:onboarded");
const hasProfile = localStorage.getItem("ai-newsroom:interest-profile");
if (!onboarded && !hasProfile) navigate("/onboarding");
```

Both keys are checked — if either exists the user is considered onboarded (handles users who set interests before the flag existed).

**Onboarding completion** (`onboarding.tsx` `completeOnboarding()`):
1. Map topic IDs → labels
2. Call `setInterests(labels)` — saves to localStorage `ai-newsroom:interest-profile`
3. Set `localStorage.setItem("ai-newsroom:onboarded", "true")`
4. Fire API calls to server (best-effort, non-blocking)
5. `navigate("/")`

**Why:** Interests must be saved to localStorage BEFORE navigating to the feed, because the feed reads interests from localStorage synchronously on mount. The API sync is best-effort.
