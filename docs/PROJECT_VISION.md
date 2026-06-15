# PROJECT_VISION.md — Personal AI Newsroom V1

## Project Name
**Personal AI Newsroom V1**

---

## Mission

Create a web application that allows users to build their own personalized AI-powered news feed.

The goal is **NOT** to create a traditional news website.

The goal is to create a **personal newsroom** where users receive only the information they care about.

---

## Why This Exists

The modern news landscape is overwhelming. Users are flooded with information they didn't ask for and miss the topics they actually care about. Personal AI Newsroom solves this by letting the user define their world — and delivering only that, summarized clearly in Thai.

---

## Target User

The founder is the primary user in V1.

**Success = The founder uses the product daily without being asked.**

If the product is not used every day, it has failed — regardless of how technically complete it is.

---

## Example Topics

- AI News
- Stock Market
- Economy
- Politics
- Gold Price
- Technology
- Business

---

## V1 User Flow

1. User opens the website
2. User selects a topic (e.g. "AI News", "Gold Price")
3. System collects relevant news from configured sources
4. AI summarizes the news **in Thai**
5. User reads the summary
6. **Optional:** Send summary to Telegram

---

## V1 Success Criteria

- [ ] User can select a topic
- [ ] System fetches real news for that topic
- [ ] AI generates a Thai-language summary
- [ ] Summary is readable and accurate
- [ ] Optional Telegram delivery works
- [ ] **Founder uses this product daily**

---

## What V1 Does NOT Include

These features are explicitly excluded from V1:

- Marketplace
- Agent Store
- Office Decoration
- Subscription System
- Payment System
- Multi-Agent Economy
- Gamification
- User authentication (unless required)
- Multi-user support

These belong to future versions only.

---

## Long-Term Vision (Future Versions)

Future versions may support:

- Reporter Agent
- Editor Agent
- Analyst Agent
- Content Writer Agent
- Telegram Delivery (automated)
- LINE Delivery
- Personalized Newsroom Dashboard
- Agent Marketplace

**All future features must be built on top of the clean modular architecture defined in ARCHITECTURE.md.**

Every V1 decision should be made with this future in mind — without implementing it prematurely.

---

## Guiding Principles

1. **Build for the founder first.** If the founder doesn't love it, no one else will.
2. **Smallest working product wins.** Do not over-engineer V1.
3. **Modularity over monolith.** Every service should be swappable.
4. **AI is a tool, not a gimmick.** Summaries must be genuinely useful.
5. **Thai language first.** Summaries are in Thai unless explicitly changed.
