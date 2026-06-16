// ============================================================
// RUNTIME SEPARATION — Sprint 17 Task H
//
// Documents and prepares INFOX for migration off Replit runtime.
// Classifies each service by persistence requirement and failure
// mode during runtime sleep.
//
// This is an architecture module — no production logic here.
// Production code reads the classification to make decisions.
// ============================================================

// ── Service classification ─────────────────────────────────────

export type PersistenceRequirement = "stateless" | "in-memory" | "db-backed" | "external";
export type SleepSafety = "safe" | "degrades" | "breaks";
export type OwnershipModel = "server" | "worker" | "external-cron" | "client";

export interface ServiceClassification {
  serviceId: string;
  displayName: string;
  persistenceRequirement: PersistenceRequirement;
  sleepSafety: SleepSafety;
  ownershipModel: OwnershipModel;
  breaksDuringSleep: string[];
  mitigations: string[];
  migrationTarget: string;
  priority: "P0" | "P1" | "P2";
}

export const SERVICE_CLASSIFICATIONS: ServiceClassification[] = [
  {
    serviceId: "delivery-scheduler",
    displayName: "Delivery Scheduler (7am/6pm)",
    persistenceRequirement: "in-memory",
    sleepSafety: "breaks",
    ownershipModel: "worker",
    breaksDuringSleep: [
      "Scheduled briefings missed if Replit sleeps at delivery time",
      "No missed-delivery recovery unless startup recovery runs",
    ],
    mitigations: [
      "Startup recovery re-queues missed deliveries on boot",
      "Migrate to: GitHub Actions / Upstash QStash / Railway cron",
    ],
    migrationTarget: "Upstash QStash or GitHub Actions cron",
    priority: "P0",
  },
  {
    serviceId: "narrative-memory",
    displayName: "Narrative Memory (14-day threads)",
    persistenceRequirement: "in-memory",
    sleepSafety: "breaks",
    ownershipModel: "server",
    breaksDuringSleep: [
      "All narrative threads lost on process restart",
      "Entity memory reset to empty",
      "User adaptation signals lost",
    ],
    mitigations: [
      "Migrate narrativeStore to PostgreSQL (schema exists as narrativeThreads table candidate)",
      "Write checkpoint worker that flushes to DB every 30 min",
    ],
    migrationTarget: "PostgreSQL narrative_threads table + 30-min checkpoint worker",
    priority: "P0",
  },
  {
    serviceId: "token-governor",
    displayName: "Token Governor (budget tracking)",
    persistenceRequirement: "in-memory",
    sleepSafety: "degrades",
    ownershipModel: "server",
    breaksDuringSleep: [
      "Daily token usage counter resets to zero on restart",
      "Budget pressure detection starts fresh — may over-spend early after restart",
    ],
    mitigations: [
      "Write daily usage to PostgreSQL every 15 min",
      "Read from DB on startup to restore counter",
    ],
    migrationTarget: "PostgreSQL token_usage_log table",
    priority: "P1",
  },
  {
    serviceId: "intelligence-cache",
    displayName: "Intelligence Cache (narrative summaries)",
    persistenceRequirement: "in-memory",
    sleepSafety: "degrades",
    ownershipModel: "server",
    breaksDuringSleep: [
      "All cached briefings lost on restart",
      "First request after restart forces regeneration (higher cost)",
    ],
    mitigations: [
      "Acceptable trade-off — cache miss causes LLM call, not failure",
      "Optional: migrate to Redis for persistent cache across restarts",
    ],
    migrationTarget: "Redis (Upstash) — optional",
    priority: "P2",
  },
  {
    serviceId: "delivery-queue",
    displayName: "Delivery Queue (retry system)",
    persistenceRequirement: "db-backed",
    sleepSafety: "safe",
    ownershipModel: "worker",
    breaksDuringSleep: [
      "No active failures — DB persists queue entries across restarts",
    ],
    mitigations: [
      "Already DB-backed — startup recovery handles requeue",
    ],
    migrationTarget: "Already safe — no migration needed",
    priority: "P2",
  },
  {
    serviceId: "user-profiles",
    displayName: "User Profiles (identity + preferences)",
    persistenceRequirement: "db-backed",
    sleepSafety: "safe",
    ownershipModel: "server",
    breaksDuringSleep: [
      "No active failures — profiles are PostgreSQL-backed",
    ],
    mitigations: [
      "Already DB-backed",
    ],
    migrationTarget: "Already safe — no migration needed",
    priority: "P2",
  },
  {
    serviceId: "rss-collector",
    displayName: "RSS News Collector",
    persistenceRequirement: "stateless",
    sleepSafety: "safe",
    ownershipModel: "server",
    breaksDuringSleep: [
      "No persistent state — each fetch is independent",
    ],
    mitigations: [
      "Stateless — safe for any deployment model",
    ],
    migrationTarget: "Any stateless compute (Lambda, Fly.io, Railway)",
    priority: "P2",
  },
  {
    serviceId: "ai-provider",
    displayName: "AI Provider (GitHub Models / OpenAI)",
    persistenceRequirement: "external",
    sleepSafety: "safe",
    ownershipModel: "server",
    breaksDuringSleep: [
      "External API — no process state",
    ],
    mitigations: [
      "No local state — provider calls are stateless HTTP",
    ],
    migrationTarget: "Already external — no migration needed",
    priority: "P2",
  },
];

// ── Runtime sleep detection ────────────────────────────────────

let lastPingMs: number = Date.now();
let sleepCount = 0;
const SLEEP_THRESHOLD_MS = 10 * 60 * 1000; // 10 min gap = likely slept

export function recordRuntimePing(): void {
  const now = Date.now();
  const gap = now - lastPingMs;
  if (gap > SLEEP_THRESHOLD_MS) {
    sleepCount++;
  }
  lastPingMs = now;
}

export function getRuntimeStats(): {
  uptimeSince: string;
  lastPingMs: number;
  sleepCount: number;
  estimatedSleepGapMs: number;
  p0ServicesAtRisk: string[];
} {
  const p0AtRisk = SERVICE_CLASSIFICATIONS
    .filter((s) => s.priority === "P0" && s.sleepSafety === "breaks")
    .map((s) => s.displayName);

  return {
    uptimeSince: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    lastPingMs,
    sleepCount,
    estimatedSleepGapMs: Date.now() - lastPingMs,
    p0ServicesAtRisk: p0AtRisk,
  };
}

// ── Migration plan query ───────────────────────────────────────

export function getMigrationPlan(): {
  phase: string;
  priority: string;
  services: ServiceClassification[];
  targetPlatform: string;
}[] {
  return [
    {
      phase: "Phase 1 — Critical (P0)",
      priority: "Immediate",
      services: SERVICE_CLASSIFICATIONS.filter((s) => s.priority === "P0"),
      targetPlatform: "Upstash QStash (scheduler) + PostgreSQL checkpoints (narrative memory)",
    },
    {
      phase: "Phase 2 — Important (P1)",
      priority: "Sprint 18–19",
      services: SERVICE_CLASSIFICATIONS.filter((s) => s.priority === "P1"),
      targetPlatform: "PostgreSQL persistence for token governor",
    },
    {
      phase: "Phase 3 — Optional (P2)",
      priority: "Post-launch",
      services: SERVICE_CLASSIFICATIONS.filter((s) => s.priority === "P2"),
      targetPlatform: "Redis (Upstash) for cache persistence",
    },
  ];
}
