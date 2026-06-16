// ============================================================
// LONG-TERM MEMORY FOUNDATION — Sprint 10 Task I
//
// Architecture-only module. Defines interfaces and contracts
// for migrating from in-memory storage to:
//   - PostgreSQL (structured entity/narrative storage)
//   - Vector memory (semantic search over past briefings)
//   - Cross-session entity memory
//   - Multi-device context synchronization
//
// No database migration is performed in this sprint.
// This file establishes the typed contracts so future
// persistence work is a drop-in replacement.
//
// Migration path:
//   Sprint 10: in-memory + localStorage (current)
//   Sprint 11: PostgreSQL via Replit DB (activate with USE_POSTGRES=true)
//   Sprint 12: Vector embeddings for semantic briefing search
//   Sprint 13: Multi-device sync via user auth
// ============================================================

// ── Storage Abstraction Layer ──────────────────────────────────

/**
 * Generic storage backend interface.
 * Current implementation: in-memory.
 * Future: PostgreSQL, Redis, vector DB.
 */
export interface IMemoryStore<K, V> {
  get(key: K): Promise<V | null>;
  set(key: K, value: V, ttlMs?: number): Promise<void>;
  delete(key: K): Promise<void>;
  list(filter?: Partial<V>): Promise<V[]>;
  count(): Promise<number>;
}

/**
 * Vector memory interface for semantic search.
 * Future: pgvector, Pinecone, Qdrant.
 */
export interface IVectorStore {
  upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void>;
  search(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<Array<{
    id: string;
    score: number;
    metadata: Record<string, unknown>;
  }>>;
  delete(id: string): Promise<void>;
}

// ── Entity Memory Schema (PostgreSQL target) ───────────────────

/**
 * PostgreSQL schema target for entity memory.
 *
 * CREATE TABLE entity_memory (
 *   id           TEXT PRIMARY KEY,           -- entity ID (from INTEREST_GRAPH)
 *   label        TEXT NOT NULL,
 *   type         TEXT NOT NULL,              -- company/person/crypto/etc
 *   total_mentions INTEGER DEFAULT 0,
 *   mentions_24h   INTEGER DEFAULT 0,
 *   mentions_7d    INTEGER DEFAULT 0,
 *   trend_direction TEXT DEFAULT 'stable',
 *   first_seen   TIMESTAMPTZ NOT NULL,
 *   last_seen    TIMESTAMPTZ NOT NULL,
 *   expires_at   TIMESTAMPTZ NOT NULL,
 *   metadata     JSONB DEFAULT '{}'::jsonb
 * );
 *
 * CREATE INDEX ON entity_memory (last_seen DESC);
 * CREATE INDEX ON entity_memory (trend_direction);
 */
export interface EntityMemoryRecord {
  id: string;
  label: string;
  type: string;
  totalMentions: number;
  mentions24h: number;
  mentions7d: number;
  trendDirection: "rising" | "stable" | "declining";
  firstSeen: Date;
  lastSeen: Date;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

// ── Narrative Memory Schema (PostgreSQL target) ────────────────

/**
 * PostgreSQL schema target for narrative memory.
 *
 * CREATE TABLE narrative_threads (
 *   id               TEXT PRIMARY KEY,
 *   canonical_headline TEXT NOT NULL,
 *   theme            TEXT NOT NULL,
 *   dominant_entity  TEXT,
 *   related_entities TEXT[] DEFAULT '{}',
 *   total_mentions   INTEGER DEFAULT 0,
 *   avg_signal_score FLOAT DEFAULT 0,
 *   peak_score       FLOAT DEFAULT 0,
 *   maturity         TEXT DEFAULT 'emerging',
 *   sentiment        TEXT DEFAULT 'neutral',
 *   trend_accel      FLOAT DEFAULT 0,
 *   first_seen       TIMESTAMPTZ NOT NULL,
 *   last_seen        TIMESTAMPTZ NOT NULL,
 *   expires_at       TIMESTAMPTZ NOT NULL
 * );
 *
 * CREATE TABLE narrative_developments (
 *   id             SERIAL PRIMARY KEY,
 *   narrative_id   TEXT REFERENCES narrative_threads(id),
 *   headline       TEXT NOT NULL,
 *   sources        TEXT[] DEFAULT '{}',
 *   recorded_at    TIMESTAMPTZ NOT NULL,
 *   article_count  INTEGER DEFAULT 1,
 *   signal_score   FLOAT DEFAULT 0
 * );
 *
 * CREATE INDEX ON narrative_developments (narrative_id, recorded_at DESC);
 */
export interface NarrativeThreadRecord {
  id: string;
  canonicalHeadline: string;
  theme: string;
  dominantEntity: string | null;
  relatedEntities: string[];
  totalMentions: number;
  avgSignalScore: number;
  peakScore: number;
  maturity: string;
  sentiment: string;
  trendAcceleration: number;
  firstSeen: Date;
  lastSeen: Date;
  expiresAt: Date;
}

// ── Adaptive Learning Schema (PostgreSQL target) ───────────────

/**
 * PostgreSQL schema for adaptive interest weights.
 *
 * CREATE TABLE entity_adaptations (
 *   entity_id       TEXT NOT NULL,
 *   user_id         TEXT NOT NULL DEFAULT 'default',
 *   boost_mult      FLOAT DEFAULT 1.0,
 *   engagements     INTEGER DEFAULT 0,
 *   ignores         INTEGER DEFAULT 0,
 *   pos_feedback    INTEGER DEFAULT 0,
 *   neg_feedback    INTEGER DEFAULT 0,
 *   last_engaged    TIMESTAMPTZ,
 *   last_ignored    TIMESTAMPTZ,
 *   PRIMARY KEY (entity_id, user_id)
 * );
 *
 * CREATE TABLE user_feedback (
 *   id              SERIAL PRIMARY KEY,
 *   user_id         TEXT NOT NULL DEFAULT 'default',
 *   article_url     TEXT NOT NULL,
 *   article_title   TEXT NOT NULL,
 *   feedback_type   TEXT NOT NULL,
 *   entities        TEXT[] DEFAULT '{}',
 *   topic_id        TEXT NOT NULL,
 *   narrative_id    TEXT,
 *   recorded_at     TIMESTAMPTZ NOT NULL
 * );
 */
export interface EntityAdaptationRecord {
  entityId: string;
  userId: string;
  boostMultiplier: number;
  engagements: number;
  ignores: number;
  positiveFeedback: number;
  negativeFeedback: number;
  lastEngaged: Date | null;
  lastIgnored: Date | null;
}

// ── Vector Memory Schema ───────────────────────────────────────

/**
 * Vector memory for semantic briefing search.
 * Requires: pgvector extension or external vector DB.
 *
 * CREATE TABLE briefing_embeddings (
 *   id           TEXT PRIMARY KEY,           -- briefingCache key
 *   topic_id     TEXT NOT NULL,
 *   embedding    vector(1536),               -- OpenAI ada-002 dimensions
 *   briefing_text TEXT NOT NULL,
 *   created_at   TIMESTAMPTZ NOT NULL,
 *   metadata     JSONB DEFAULT '{}'::jsonb
 * );
 *
 * CREATE INDEX ON briefing_embeddings USING ivfflat (embedding vector_cosine_ops);
 *
 * Query example:
 *   SELECT id, briefing_text, 1 - (embedding <=> $1) AS similarity
 *   FROM briefing_embeddings
 *   WHERE topic_id = $2
 *   ORDER BY embedding <=> $1
 *   LIMIT 5;
 */
export interface BriefingEmbeddingRecord {
  id: string;
  topicId: string;
  embedding: number[];
  briefingText: string;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// ── Migration Status ───────────────────────────────────────────

export interface MigrationStatus {
  phase: 1 | 2 | 3 | 4;
  description: string;
  currentStorage: "in-memory" | "postgresql" | "postgresql+vector" | "distributed";
  nextStep: string;
  readyForMigration: boolean;
}

/**
 * Get current migration status.
 * Phase 1: in-memory (current)
 * Phase 2: PostgreSQL (next sprint — requires Replit DB provisioning)
 * Phase 3: PostgreSQL + vector embeddings
 * Phase 4: Distributed multi-device
 */
export function getMigrationStatus(): MigrationStatus {
  return {
    phase: 1,
    description: "In-memory with localStorage client-side sync",
    currentStorage: "in-memory",
    nextStep: "Provision Replit PostgreSQL DB, activate USE_POSTGRES=true env var",
    readyForMigration: true, // interfaces are all defined; no code changes needed in consumers
  };
}

/**
 * Check if PostgreSQL is available.
 * Returns false in Sprint 10 (in-memory only).
 * In Sprint 11: check DATABASE_URL env var.
 */
export function isPostgresAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Cross-session context object.
 * Serializable summary of all long-term memory for a user session.
 * Can be reconstructed from PostgreSQL in Sprint 11.
 */
export interface CrossSessionContext {
  userId: string;
  sessionId: string;
  topEntities: Array<{ entityId: string; weight: number }>;
  activeNarratives: Array<{ id: string; headline: string; maturity: string }>;
  adaptationBoosts: Record<string, number>;    // entityId → boost
  lastSyncedAt: string;
  storagePhase: MigrationStatus["phase"];
}
