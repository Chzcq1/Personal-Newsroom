// ============================================================
// MULTI-AGENT ARCHITECTURE PREPARATION — Sprint 9–11 Task K
//
// Architecture-only module. No UI. No active LLM calls.
//
// Sprint 9:  Defined agent contracts using NarrativeCluster as context.
// Sprint 10: Extended with shared memory contracts — agents share
//            NarrativeMemory, EntityMemory, AdaptiveInterestEngine,
//            FeedAdaptationEngine.
// Sprint 11: Proactive Intelligence orchestration layer v1.
//            Three new intelligence-gated agent types:
//              ProactiveIntelligenceAgent — fires on high momentum narratives
//              EarlySignalAgent           — fires on high-confidence signals
//              EcosystemAgent             — fires when ≥ 3 narratives form an ecosystem
//            Orchestration queue contracts with priority bands.
//            No active orchestrator code yet — interfaces + activation logic only.
// ============================================================

import type { NarrativeCluster } from "./narrativeCluster.js";
import type { NarrativeThread } from "./narrativeMemory.js";
import type { EntityMemoryEntry } from "./entityMemory.js";
import type { NarrativeTrend } from "./trendAcceleration.js";
import type { EarlySignal } from "./earlySignalDetector.js";
import type { NarrativeEcosystem } from "./narrativeRelationshipEngine.js";
import type { UserIntelligenceProfile } from "./userIntelligenceProfile.js";

// ── Agent Types ──────────────────────────────────────────────

export type AgentRole =
  | "bull"
  | "bear"
  | "macro"
  | "tech"
  | "policy"
  | "proactive"      // Sprint 11: fires on accelerating momentum
  | "early_signal"   // Sprint 11: fires on early signals
  | "ecosystem";     // Sprint 11: fires on ecosystem formation

export type AgentPriority = "critical" | "high" | "normal" | "low";

export interface AgentAnalysisRequest {
  clusterId: string;
  cluster: NarrativeCluster;
  userInterests: string[];
  role: AgentRole;
  maxTokens?: number;
  priority?: AgentPriority;
}

export interface AgentAnalysisResult {
  clusterId: string;
  role: AgentRole;
  perspective: string;
  signals: string[];
  recommendation: "watch" | "act" | "ignore";
  confidence: number;
  generatedAt: string;
}

// ── Context Distribution Contract ────────────────────────────

/**
 * Prepare a cluster for distribution to multiple agents.
 * Each agent receives the same cluster with role-specific instructions.
 */
export function prepareClusterForAgents(
  cluster: NarrativeCluster,
  userInterests: string[],
): Map<AgentRole, AgentAnalysisRequest> {
  const roles: AgentRole[] = ["bull", "bear", "macro", "tech", "policy"];
  const requests = new Map<AgentRole, AgentAnalysisRequest>();

  for (const role of roles) {
    if (!isAnalystRelevant(role, cluster)) continue;
    requests.set(role, {
      clusterId: cluster.id,
      cluster,
      userInterests,
      role,
      maxTokens: 200,
      priority: "normal",
    });
  }

  return requests;
}

function isAnalystRelevant(role: AgentRole, cluster: NarrativeCluster): boolean {
  const { keyTerms } = cluster.agentContext;
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

// ── Agent Role Instructions ──────────────────────────────────

export const AGENT_SYSTEM_PROMPTS: Record<AgentRole, string> = {
  bull: "You are the Bull Agent. Identify positive catalysts, upside potential, and bullish signals. Look for demand drivers, positive surprises, and momentum signals.",

  bear: "You are the Bear Agent. Identify risks, downside scenarios, and bearish signals. Look for overvaluation, execution risks, competitive threats, and regulatory headwinds.",

  macro: "You are the Macro Agent. Identify macro-level implications. Focus on interest rate sensitivity, currency effects, global growth, sector rotation, and systemic risks.",

  tech: "You are the Tech Agent. Evaluate technical and product significance. Focus on technology breakthrough signals, competitive moats, product cycles, and adoption curves.",

  policy: "You are the Policy Agent. Evaluate regulatory and policy implications. Focus on regulatory risk, government intervention, legislative drivers, and geopolitical exposure.",

  proactive: "You are the Proactive Intelligence Agent. You are activated when a narrative is accelerating rapidly. Your job is to get ahead of the story: What will happen next? What are the second-order effects? Who wins and loses if this trend continues? Be forward-looking, not descriptive.",

  early_signal: "You are the Early Signal Agent. You are activated when a weak signal is detected across multiple sources before it becomes mainstream. Your job is to assess: Is this signal real or noise? What underlying shift does it indicate? What established narratives could be disrupted? Rank confidence honestly.",

  ecosystem: "You are the Ecosystem Agent. You are activated when multiple narratives converge into a connected ecosystem. Your job is to map the connections: Which narratives reinforce each other? Which entities are pivotal? What is the dominant story emerging from this ecosystem? Synthesise, don't summarise.",
};

// ── Sprint 10 Task K: Shared Memory Context ─────────────────

/**
 * Shared memory snapshot available to all agents.
 */
export interface SharedAgentMemory {
  activeNarratives: NarrativeThread[];
  risingEntities: EntityMemoryEntry[];
  adaptationBoosts: Record<string, number>;
  expandedInterests: string[];
  // Sprint 11 additions
  acceleratingTrends: NarrativeTrend[];
  earlySignals: EarlySignal[];
  userProfile: UserIntelligenceProfile | null;
  generatedAt: string;
}

/**
 * Extended agent request that includes shared memory context.
 */
export interface AgentAnalysisRequestV2 extends AgentAnalysisRequest {
  sharedMemory: SharedAgentMemory;
  narrativeThread: NarrativeThread | null;
}

// ── Sprint 11 Task K: Proactive Orchestration Contracts ──────

/**
 * Proactive trigger — fired when the intelligence engine detects
 * conditions that warrant proactive analysis BEFORE the user asks.
 */
export interface ProactiveTrigger {
  type:
    | "momentum_spike"       // narrative momentum > 70 and accelerating
    | "early_signal_burst"   // ≥ 3 high-confidence signals in 2h
    | "ecosystem_formation"  // ≥ 3 narratives form a new ecosystem
    | "entity_breakthrough"  // entity influence jumps a tier in 24h
    | "blind_spot_alert";    // user's blind spot is suddenly spiking
  confidence: number;         // 0-1 trigger confidence
  narrativeIds: string[];
  entityIds: string[];
  signalIds: string[];
  triggeredAt: string;
  agentRole: AgentRole;
  priority: AgentPriority;
  context: string;            // one-line trigger reason
}

/**
 * Evaluate whether a proactive trigger should fire.
 * Sprint 11 orchestration gate — no LLM call until this passes.
 */
export function evaluateProactiveTrigger(
  trends: NarrativeTrend[],
  signals: EarlySignal[],
  ecosystems: NarrativeEcosystem[],
  userProfile: UserIntelligenceProfile | null,
): ProactiveTrigger[] {
  const triggers: ProactiveTrigger[] = [];
  const now = new Date().toISOString();

  // Momentum spike trigger
  const spiking = trends.filter(
    (t) => t.momentumScore >= 70 && t.classification === "accelerating",
  );
  if (spiking.length > 0) {
    triggers.push({
      type: "momentum_spike",
      confidence: Math.min(1.0, spiking[0].momentumScore / 100),
      narrativeIds: spiking.slice(0, 3).map((t) => t.narrativeId),
      entityIds: spiking.filter((t) => t.dominantEntity).map((t) => t.dominantEntity!),
      signalIds: [],
      triggeredAt: now,
      agentRole: "proactive",
      priority: "high",
      context: `${spiking.length} narrative(s) accelerating above 70 momentum`,
    });
  }

  // Early signal burst
  const highConfidenceSignals = signals.filter((s) => s.confidence >= 0.6);
  const recentBurst = highConfidenceSignals.filter(
    (s) => Date.now() - new Date(s.firstDetectedAt).getTime() < 2 * 3_600_000,
  );
  if (recentBurst.length >= 2) {
    triggers.push({
      type: "early_signal_burst",
      confidence: Math.min(1.0, recentBurst[0].confidence),
      narrativeIds: [],
      entityIds: recentBurst.flatMap((s) => s.entities).slice(0, 5),
      signalIds: recentBurst.slice(0, 3).map((s) => s.id),
      triggeredAt: now,
      agentRole: "early_signal",
      priority: "high",
      context: `${recentBurst.length} high-confidence signals burst in last 2h`,
    });
  }

  // Ecosystem formation
  const newEcosystems = ecosystems.filter((e) => e.totalNodes >= 3 && e.avgStrength >= 0.3);
  if (newEcosystems.length > 0) {
    triggers.push({
      type: "ecosystem_formation",
      confidence: Math.min(1.0, newEcosystems[0].avgStrength + 0.2),
      narrativeIds: newEcosystems[0].coreNarrativeIds.slice(0, 5),
      entityIds: newEcosystems[0].dominantEntities.slice(0, 3),
      signalIds: [],
      triggeredAt: now,
      agentRole: "ecosystem",
      priority: "normal",
      context: `Ecosystem "${newEcosystems[0].label}" formed with ${newEcosystems[0].totalNodes} narratives`,
    });
  }

  // Blind spot alert — user's known blind spots are in spiking narratives
  if (userProfile && userProfile.blindSpots.length > 0) {
    const blindSpotSpiking = spiking.filter((t) =>
      userProfile.blindSpots.some(
        (bs) => t.dominantEntity?.toLowerCase().includes(bs.toLowerCase()),
      ),
    );
    if (blindSpotSpiking.length > 0) {
      triggers.push({
        type: "blind_spot_alert",
        confidence: 0.8,
        narrativeIds: blindSpotSpiking.map((t) => t.narrativeId),
        entityIds: userProfile.blindSpots.slice(0, 3),
        signalIds: [],
        triggeredAt: now,
        agentRole: "proactive",
        priority: "critical",
        context: `User's blind spot area "${userProfile.blindSpots[0]}" is now accelerating`,
      });
    }
  }

  return triggers.sort((a, b) => {
    const priority = { critical: 0, high: 1, normal: 2, low: 3 };
    return priority[a.priority] - priority[b.priority];
  });
}

/**
 * Agent activation conditions — Sprint 11 upgrade.
 * Now gates on narrative maturity AND trend momentum.
 */
export function isAgentActivationReady(
  role: AgentRole,
  cluster: NarrativeCluster,
  thread: NarrativeThread | null,
  trend: NarrativeTrend | null,
): boolean {
  // Resolved/declining narratives don't warrant agent activation
  if (thread && (thread.maturity === "resolved" || thread.maturity === "declining")) {
    return false;
  }

  // Sprint 11: momentum gate — only high-momentum narratives get intelligence agents
  if (role === "proactive" || role === "early_signal" || role === "ecosystem") {
    return (trend?.momentumScore ?? 0) >= 50;
  }

  return isAnalystRelevant(role, cluster);
}

/**
 * Build shared memory context for agent distribution.
 * Sprint 11: now includes trend + signal + profile data.
 */
export function buildSharedMemory(
  activeNarratives: NarrativeThread[],
  risingEntities: EntityMemoryEntry[],
  adaptationBoosts: Record<string, number>,
  expandedInterests: string[],
  acceleratingTrends: NarrativeTrend[],
  earlySignals: EarlySignal[],
  userProfile: UserIntelligenceProfile | null,
): SharedAgentMemory {
  return {
    activeNarratives,
    risingEntities,
    adaptationBoosts,
    expandedInterests,
    acceleratingTrends,
    earlySignals,
    userProfile,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Orchestrator state — Sprint 11 v1.
 */
export interface OrchestratorState {
  activeAgents: AgentRole[];
  pendingClusters: string[];
  completedAnalyses: Map<string, AgentAnalysisResult[]>;
  pendingTriggers: ProactiveTrigger[];
  sharedMemory: SharedAgentMemory | null;
  status: "idle" | "collecting" | "analyzing" | "synthesizing" | "triggered";
  lastRunAt: string | null;
  lastTriggerAt: string | null;
}

// ── Re-exports ───────────────────────────────────────────────

export type {
  NarrativeCluster,
  NarrativeThread,
  EntityMemoryEntry,
  NarrativeTrend,
  EarlySignal,
  NarrativeEcosystem,
  UserIntelligenceProfile,
};
