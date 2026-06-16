// ============================================================
// MULTI-AGENT ARCHITECTURE PREPARATION — Sprint 9 Task K / Sprint 10 Task K
//
// Architecture-only module. No UI. No active processing.
//
// Sprint 9: Defined agent contracts using NarrativeCluster as context.
// Sprint 10: Extended with shared memory contracts — agents now share:
//   - NarrativeMemory (persistent thread tracking)
//   - EntityMemory (cross-session entity tracking)
//   - AdaptiveInterestEngine (user behavior graph)
//   - FeedAdaptationEngine (engagement + feedback signals)
//
// Shared context objects replace raw articles as the unit of
// inter-agent communication. This mirrors how analyst teams work:
//   1. Clustering analyst identifies narratives (NarrativeCluster)
//   2. Memory analyst tracks evolution (NarrativeThread)
//   3. Entity analyst maps relationships (EntityMemory)
//   4. Specialist agents reason from their domain lens
//
// Agent activation conditions are refined in Sprint 10 to use
// narrative maturity and trend acceleration as gating signals.
//
// Implementation note:
//   The orchestrator (AGENT_ARCHITECTURE.md) will manage lifecycle.
//   No active orchestrator code is implemented in Sprint 10.
// ============================================================

import type { NarrativeCluster } from "./narrativeCluster.js";
import type { NarrativeThread } from "./narrativeMemory.js";
import type { EntityMemoryEntry } from "./entityMemory.js";

// ── Agent Types ──────────────────────────────────────────────

export type AgentRole = "bull" | "bear" | "macro" | "tech" | "policy";

export interface AgentAnalysisRequest {
  clusterId: string;
  cluster: NarrativeCluster;
  userInterests: string[];
  role: AgentRole;
  maxTokens?: number;
}

export interface AgentAnalysisResult {
  clusterId: string;
  role: AgentRole;
  perspective: string;   // agent's analysis from its role perspective
  signals: string[];     // key signals identified
  recommendation: "watch" | "act" | "ignore";
  confidence: number;    // 0–1
  generatedAt: string;
}

// ── Context Distribution Contract ────────────────────────────

/**
 * Prepare a cluster for distribution to multiple agents.
 * Each agent receives the same cluster but with role-specific instructions.
 *
 * This function is the bridge between the intelligence layer
 * and the future agent layer.
 */
export function prepareClusterForAgents(
  cluster: NarrativeCluster,
  userInterests: string[],
): Map<AgentRole, AgentAnalysisRequest> {
  const roles: AgentRole[] = ["bull", "bear", "macro", "tech", "policy"];
  const requests = new Map<AgentRole, AgentAnalysisRequest>();

  for (const role of roles) {
    // Only activate agents relevant to cluster type
    if (!isAgentRelevant(role, cluster)) continue;

    requests.set(role, {
      clusterId: cluster.id,
      cluster,
      userInterests,
      role,
      maxTokens: 200,
    });
  }

  return requests;
}

/**
 * Determine if an agent role is relevant to a cluster type.
 * Prevents activating all 5 agents for every cluster (expensive).
 */
function isAgentRelevant(role: AgentRole, cluster: NarrativeCluster): boolean {
  const { clusterType, keyTerms } = cluster.agentContext;
  const text = [...keyTerms, cluster.headline, cluster.dominantEntity ?? ""].join(" ").toLowerCase();

  switch (role) {
    case "bull":
    case "bear":
      return cluster.isMultiSource; // only multi-source clusters warrant bull/bear
    case "macro":
      return /\b(rate|inflation|gdp|fed|treasury|yield|economy|recession|tariff)\b/.test(text);
    case "tech":
      return /\b(nvidia|openai|chip|gpu|model|launch|release|compute|ai|semiconductor)\b/.test(text);
    case "policy":
      return /\b(regulation|sec|congress|senate|ban|law|policy|ruling|court|sanction)\b/.test(text);
    default:
      return false;
  }
}

// ── Agent Role Instructions ──────────────────────────────────
// Pre-built system prompt fragments for each agent role.
// To be used by the orchestrator when activating agents.

export const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  bull: `You are the Bull Agent. Your role is to identify positive catalysts, upside potential, and bullish signals in the narrative. Look for: demand drivers, positive surprises, underappreciated opportunities, favorable macro conditions, and momentum signals. Be specific about what could drive price or sentiment higher.`,

  bear: `You are the Bear Agent. Your role is to identify risks, downside scenarios, and bearish signals in the narrative. Look for: overvaluation, execution risks, competitive threats, regulatory headwinds, and negative surprises. Be specific about what could disappoint or reverse trends.`,

  macro: `You are the Macro Agent. Your role is to identify macro-level implications of the narrative. Focus on: interest rate sensitivity, currency effects, global growth implications, sector rotation signals, and systemic risks. Connect company-level events to broader economic trends.`,

  tech: `You are the Tech Agent. Your role is to evaluate the technical and product significance of the narrative. Focus on: technology breakthrough signals, competitive moats, product cycles, R&D implications, and technical adoption curves. Separate marketing from genuine technical progress.`,

  policy: `You are the Policy Agent. Your role is to evaluate regulatory, political, and policy implications. Focus on: regulatory risk, government intervention likelihood, legislative drivers, geopolitical exposure, and compliance costs. Assess probability and timeline of policy impact.`,
};

// ── Sprint 10 Task K: Shared Memory Context ─────────────────
// Contracts for distributing long-term memory to agents.
// Agents need shared context beyond per-request clusters.

/**
 * Shared memory snapshot available to all agents.
 * Populated by the orchestrator before dispatching agents.
 */
export interface SharedAgentMemory {
  // Persistent narrative threads (Sprint 10 Task C)
  activeNarratives: NarrativeThread[];
  // Entity memory snapshot — top 20 most active entities
  risingEntities: EntityMemoryEntry[];
  // User adaptation state (entity boosts/suppressions)
  adaptationBoosts: Record<string, number>;  // entityId → boost multiplier
  // Current session interest expansion
  expandedInterests: string[];
  // Memory freshness
  generatedAt: string;
}

/**
 * Extended agent request that includes shared memory context.
 * Sprint 10 upgrade of AgentAnalysisRequest.
 */
export interface AgentAnalysisRequestV2 extends AgentAnalysisRequest {
  sharedMemory: SharedAgentMemory;
  narrativeThread: NarrativeThread | null;  // persistent thread for this cluster
}

/**
 * Orchestrator state — tracks which agents are active and ready.
 * No implementation in Sprint 10; interfaces only.
 */
export interface OrchestratorState {
  activeAgents: AgentRole[];
  pendingClusters: string[];          // cluster IDs waiting for analysis
  completedAnalyses: Map<string, AgentAnalysisResult[]>;
  sharedMemory: SharedAgentMemory | null;
  status: "idle" | "collecting" | "analyzing" | "synthesizing";
  lastRunAt: string | null;
}

/**
 * Agent activation conditions (Sprint 10 refinement).
 * Now also gates on narrative maturity — only "active" and "peaking"
 * narratives are routed to the expensive agent layer.
 */
export function isAgentActivationReady(
  role: AgentRole,
  cluster: NarrativeCluster,
  thread: NarrativeThread | null,
): boolean {
  // Narrative maturity gate (Sprint 10)
  if (thread && (thread.maturity === "resolved" || thread.maturity === "declining")) {
    return false; // Don't activate agents for resolved/declining narratives
  }

  // Original activation conditions (Sprint 9)
  return isAgentRelevant(role, cluster);
}

// Keep isAgentRelevant as internal helper (renamed to avoid confusion)
function isAgentRelevant(role: AgentRole, cluster: NarrativeCluster): boolean {
  const { clusterType, keyTerms } = cluster.agentContext;
  const text = [...keyTerms, cluster.headline, cluster.dominantEntity ?? ""].join(" ").toLowerCase();

  switch (role) {
    case "bull":
    case "bear":
      return cluster.isMultiSource;
    case "macro":
      return /\b(rate|inflation|gdp|fed|treasury|yield|economy|recession|tariff)\b/.test(text);
    case "tech":
      return /\b(nvidia|openai|chip|gpu|model|launch|release|compute|ai|semiconductor)\b/.test(text);
    case "policy":
      return /\b(regulation|sec|congress|senate|ban|law|policy|ruling|court|sanction)\b/.test(text);
    default:
      return false;
  }
}

// ── Export for future use ────────────────────────────────────

export type { NarrativeCluster, NarrativeThread, EntityMemoryEntry };
