# Future Agent Architecture

> **Status:** Planning document — Sprint 8 Task K  
> **Purpose:** Describes the next evolutionary phase of INFOX toward a multi-agent intelligence system.

---

## Vision

INFOX currently operates as a pipeline: collect → score → summarize → deliver. The next phase introduces **autonomous agents** — persistent, goal-directed processes that can reason across sessions, take actions, and coordinate with each other.

This document captures the target architecture for a post-MVP agent layer.

---

## Current Architecture (Sprint 8 baseline)

```
User Request
     │
     ▼
RSS Collection (newsCollectorService.ts)
     │
     ▼ (Signal Scoring: signalScoring.ts)
     │
     ▼ (Story Evolution: storyEvolution.ts)
     │
     ▼
AI Summarization (summaryService.ts → aiProvider.ts)
     │
     ▼
Delivery (deliveryEngine.ts → IDeliveryChannel)
     │
     ▼ (Metrics: deliveryMetrics.ts)
     │
     ▼
Output (Telegram / API / Feed)
```

**Limitations of current design:**
- Single-thread: each request is fully independent
- No cross-session memory beyond in-memory ring buffers
- No agent autonomy: always waits for user trigger or scheduler
- No multi-step reasoning or goal planning
- No self-correction loop

---

## Target Agent Architecture (v2)

### Layer 1: Orchestrator Agent

Central coordinator. Holds the user's intelligence goals and dispatches sub-agents.

```
OrchestratorAgent
├── Goal: "Track AI investment landscape for Series A opportunities"
├── Horizon: rolling 30-day window
├── Sub-agents dispatched: [CollectionAgent, AnalysisAgent, AlertAgent]
└── Consolidation: synthesises outputs into daily intelligence report
```

**Key capabilities:**
- Accepts natural-language goals from user
- Decomposes goals into trackable signals and entities
- Manages sub-agent lifecycle (spawn, pause, retire)
- Consolidates outputs across agents
- Self-evaluates quality of briefings (feedback loop)

### Layer 2: Specialist Agents

Each agent has one responsibility and runs independently.

| Agent | Responsibility | Trigger |
|---|---|---|
| `CollectionAgent` | RSS + web crawl for target entities | Every 30 min |
| `SignalAgent` | Score articles, detect anomalies | After collection |
| `EvolutionAgent` | Track story arcs, detect narrative shifts | After scoring |
| `AlertAgent` | Fire priority alerts for critical events | Real-time on high signal |
| `SummaryAgent` | Generate tailored briefings | On schedule or user request |
| `FeedbackAgent` | Learn from user read patterns, adjust weights | Nightly |
| `MemoryAgent` | Maintain persistent story context across sessions | Continuous |

### Layer 3: Memory System

Replaces in-memory ring buffers with persistent, searchable memory.

```
MemoryLayer
├── EpisodicMemory     — what happened in past briefings (timestamped events)
├── SemanticMemory     — extracted facts, entity relationships, named positions
├── WorkingMemory      — current session context (active stories, watch signals)
└── ProceduralMemory   — learned preferences (what user opens, skips, or saves)
```

Storage: PostgreSQL (Replit DB) with vector embeddings for semantic search.

### Layer 4: Tool Use

Agents can invoke tools beyond RSS. Each tool has a strict output schema.

```typescript
interface AgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute(params: Record<string, unknown>): Promise<ToolResult>;
}
```

**Planned tools:**
- `searchWeb(query, maxResults)` — real-time web search
- `fetchPage(url)` — scrape and extract article text
- `queryDB(sql)` — read from Replit PostgreSQL
- `sendAlert(message, channel)` — push to delivery channels
- `updateWatchlist(entities)` — mutate user's entity watch configuration
- `evaluateBriefing(text, criteria)` — self-critique a generated briefing
- `summarizeThread(articles)` — compress story arc into single paragraph

### Layer 5: Inter-Agent Communication

Agents communicate through a typed message bus.

```typescript
interface AgentMessage {
  from: AgentId;
  to: AgentId | "broadcast";
  type: "task" | "result" | "signal" | "error";
  payload: unknown;
  priority: "low" | "normal" | "high" | "critical";
  correlationId: string;
  ttl: number; // seconds
}
```

Critical signals (e.g. AlertAgent fires on a market crash) bypass normal queuing and are delivered immediately to OrchestratorAgent and Telegram.

---

## Migration Path from Current Architecture

### Phase 1 — Persistence (next sprint)
- Move in-memory stores (storyEvolution, trendMemory, digestMemory, alertHistory) to PostgreSQL
- Add user session model and preferences table
- Deploy with Replit Auth to tie preferences to users

### Phase 2 — Sub-agent extraction
- Extract CollectionAgent from `newsCollectorService.ts`
- Extract SignalAgent from `signalScoring.ts`
- Give each agent its own process boundary and retry policy
- Add inter-agent message queue (in-memory → Redis/BullMQ for scale)

### Phase 3 — Orchestrator
- Implement OrchestratorAgent with goal management UI
- Connect tool layer (web search, DB queries)
- Add FeedbackAgent using read-progress data from my-feed.tsx

### Phase 4 — Autonomous operation
- Agents run independently on Replit's always-on infrastructure
- User interacts via Telegram commands (e.g. `/track NVDA`)
- OrchestratorAgent responds to Telegram messages as a Telegram bot

---

## Design Principles

1. **Single responsibility** — each agent does one thing well. No agent both collects and summarizes.
2. **Explicit failure** — agents surface errors; no silent fallbacks. A failed collection returns an error, not empty content.
3. **Idempotent tools** — all read tools are side-effect free. Write tools are confirmed before execution.
4. **Bounded autonomy** — agents cannot take external actions (send money, post social media) without explicit user approval. All critical actions require human-in-the-loop confirmation.
5. **Transparent reasoning** — every agent decision is logged with reasoning. The user can inspect why an alert fired or why a story was promoted.
6. **Graceful degradation** — if an agent fails, the system falls back to the simpler pipeline (current architecture). No agent failure should halt delivery entirely.

---

## Security Considerations

- **Tool sandboxing:** Agent tools are invoked through a validated proxy. No agent can execute arbitrary code.
- **Credential isolation:** API keys are never passed to agents as parameters. All credential access goes through `config/env.ts`.
- **Rate limiting:** Each agent has per-minute and per-day request limits enforced at the message bus level.
- **Audit log:** All inter-agent messages and tool invocations are logged to an append-only store.
- **Prompt injection protection:** User-provided content (watchlist terms, custom topics) is escaped before insertion into prompts. Agents never execute instructions from external content.

---

## Evaluation Metrics

| Metric | Current | Target |
|---|---|---|
| Briefing freshness | Manual trigger or 2× daily | Continuous (every 30 min for high-priority signals) |
| Alert precision | N/A | >80% true positive rate |
| Memory retention | 72h in-memory | 90 days persistent |
| Delivery reliability | Best-effort | >99.5% with retry and dead-letter queue |
| Goal coverage | Manual topic selection | Automatic entity extraction from user goals |

---

*Last updated: Sprint 8 — June 2026*
