// ============================================================
// MULTI-AGENT ARCHITECTURE PREPARATION — Sprint 9 Task K
//
// Architecture-only module. No UI. No active processing.
//
// Purpose:
//   Narrative clusters (narrativeCluster.ts) are designed to become
//   shared context objects between future specialist agents.
//
//   Each agent will receive a NarrativeCluster and reason about it
//   from its specific perspective:
//     BullAgent   — looks for upside catalysts
//     BearAgent   — looks for risks and downside signals
//     MacroAgent  — looks for macro-level implications
//     TechAgent   — looks for technical/product developments
//     PolicyAgent — looks for regulatory/political impacts
//
// This module defines the interfaces that will connect agents.
// No agent logic is implemented here — only the data contracts.
//
// Implementation note:
//   When agents are activated, they will import NarrativeCluster
//   from narrativeCluster.ts and AgentContext from this file.
//   The orchestrator (see AGENT_ARCHITECTURE.md) will manage
//   agent lifecycle and context distribution.
// ============================================================

import type { NarrativeCluster } from "./narrativeCluster.js";

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

// ── Export for future use ────────────────────────────────────

export type { NarrativeCluster };
