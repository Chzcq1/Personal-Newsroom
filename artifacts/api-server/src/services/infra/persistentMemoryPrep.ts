// ============================================================
// PERSISTENT MEMORY PREPARATION — Sprint 12 Task K
//
// Architecture interfaces and contracts for future PostgreSQL
// and vector memory integration. No active persistence yet.
//
// This module:
//   1. Defines schemas for all persisted entities
//   2. Provides in-memory fallback implementations
//   3. Documents the migration path to real persistence
//   4. Exports contracts for server-side personalization
//
// Migration path:
//   Phase 1 (now):    All stores are in-memory (this file)
//   Phase 2 (auth):   Replace with Drizzle ORM + PostgreSQL
//   Phase 3 (future): Add pgvector for semantic search
// ============================================================

// ── User Profile Schema ───────────────────────────────────────
// Future: users table in PostgreSQL

export interface UserProfile {
  id: string;              // future: UUID primary key
  createdAt: string;
  lastActiveAt: string;
  preferences: {
    personality: "analyst" | "concise" | "financial" | "neutral" | "aggressive";
    topicIds: string[];
    executiveMode: boolean;
    deliveryTimes: { morning: string; evening: string }; // "HH:MM" ICT
  };
  interests: string[];     // topic/keyword interest labels
  watchlist: string[];     // entities being tracked
}

// ── Delivery History Schema ───────────────────────────────────
// Future: delivery_history table

export interface DeliveryHistoryEntry {
  id: string;
  userId: string;
  type: "morning" | "evening" | "intelligence" | "executive";
  deliveredAt: string;
  channel: "telegram" | "email" | "line" | "discord";
  articleCount: number;
  topicsUsed: string[];
  wordCount: number;
  readingTimeSecs: number;
  tokenCost?: number;
  openedAt?: string;       // future: read receipt
  engagementScore?: number;
}

// ── Long-term User Memory Schema ──────────────────────────────
// Future: user_memory table (or pgvector)

export interface UserMemoryEntry {
  id: string;
  userId: string;
  memoryType: "interest_signal" | "entity_watch" | "topic_boost" | "taste_event";
  content: string;
  embedding?: number[];    // future: pgvector embedding
  createdAt: string;
  expiresAt?: string;
  weight: number;          // 0–1
}

// ── Digest Storage Schema ─────────────────────────────────────
// Future: digests table

export interface StoredDigest {
  id: string;
  type: "morning" | "evening" | "intelligence" | "executive";
  rawText: string;
  topicsUsed: string[];
  articleCount: number;
  generatedAt: string;
  deliveredAt?: string;
  userId?: string;
  tokenInputCount?: number;
  tokenOutputCount?: number;
}

// ── Vector Memory Schema ──────────────────────────────────────
// Future: vector_memory table with pgvector

export interface VectorMemoryEntry {
  id: string;
  type: "article" | "entity" | "narrative" | "user_interest";
  text: string;
  embedding: number[];     // 1536-dim for text-embedding-3-small
  metadata: Record<string, unknown>;
  createdAt: string;
  ttlHours?: number;
}

// ── In-memory fallback store ──────────────────────────────────
// Simulates the database interface so route code can be written
// against these contracts now and swapped for real DB later.

class InMemoryStore<T extends { id: string }> {
  private store = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  async upsert(entity: T): Promise<T> {
    this.store.set(entity.id, entity);
    if (this.store.size > this.maxSize) {
      const first = this.store.keys().next().value;
      if (first) this.store.delete(first);
    }
    return entity;
  }

  async findById(id: string): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.store.values());
    if (!filter) return all;
    return all.filter((item) =>
      Object.entries(filter).every(([k, v]) => (item as Record<string, unknown>)[k] === v)
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}

// ── Exported stores (in-memory fallback) ─────────────────────

export const userProfileStore = new InMemoryStore<UserProfile>(100);
export const deliveryHistoryStore = new InMemoryStore<DeliveryHistoryEntry>(500);
export const userMemoryStore = new InMemoryStore<UserMemoryEntry>(2000);
export const digestStore = new InMemoryStore<StoredDigest>(200);

// ── Server-side personalization contracts ─────────────────────

export interface PersonalizationContext {
  userId?: string;
  profile?: UserProfile;
  recentDeliveries: DeliveryHistoryEntry[];
  memoryEntries: UserMemoryEntry[];
  derivedInterests: string[];
  derivedWatchlist: string[];
}

export async function buildPersonalizationContext(
  userId?: string,
): Promise<PersonalizationContext> {
  if (!userId) {
    return {
      userId: undefined,
      profile: undefined,
      recentDeliveries: [],
      memoryEntries: [],
      derivedInterests: [],
      derivedWatchlist: [],
    };
  }

  const profile = await userProfileStore.findById(userId);
  const recentDeliveries = (await deliveryHistoryStore.findAll())
    .filter((d) => d.userId === userId)
    .sort((a, b) => b.deliveredAt.localeCompare(a.deliveredAt))
    .slice(0, 20);

  const memoryEntries = (await userMemoryStore.findAll())
    .filter((m) => m.userId === userId && (!m.expiresAt || new Date(m.expiresAt) > new Date()))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 50);

  return {
    userId,
    profile: profile ?? undefined,
    recentDeliveries,
    memoryEntries,
    derivedInterests: profile?.interests ?? [],
    derivedWatchlist: profile?.watchlist ?? [],
  };
}

// ── Migration readiness check ─────────────────────────────────

export interface MigrationReadinessReport {
  currentStorage: "in-memory";
  targetStorage: "postgresql";
  readyForMigration: boolean;
  blockers: string[];
  recommendations: string[];
  estimatedMigrationComplexity: "low" | "medium" | "high";
}

export function getMigrationReadiness(): MigrationReadinessReport {
  return {
    currentStorage: "in-memory",
    targetStorage: "postgresql",
    readyForMigration: false,
    blockers: [
      "No authentication system — userId is undefined for all requests",
      "No PostgreSQL connection configured (DATABASE_URL not set)",
      "Drizzle ORM schemas not yet defined for new entities",
    ],
    recommendations: [
      "Implement auth (Clerk or Replit Auth) first — provides userId anchor",
      "Define Drizzle schemas for: users, delivery_history, digests, user_memory",
      "Set DATABASE_URL in Replit Secrets",
      "Run Drizzle migrations via lib/db",
      "Replace InMemoryStore calls with Drizzle queries using same interface",
    ],
    estimatedMigrationComplexity: "medium",
  };
}
