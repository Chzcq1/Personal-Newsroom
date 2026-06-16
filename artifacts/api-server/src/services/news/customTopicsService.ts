// ============================================================
// CUSTOM TOPICS SERVICE — Sprint 6 Task F
//
// In-memory store for user-created custom briefing topics.
// Custom topics work exactly like built-in topics but with
// user-supplied sources and keywords.
//
// Architecture: same in-memory Map pattern as briefingCache,
// trendMemory, and costAnalytics — designed for DB migration.
//
// Custom topic IDs must be lowercase kebab-case and must not
// conflict with built-in topic IDs.
// ============================================================

import type { TopicDefinition, RssSource } from "../../config/topics.js";

export interface CustomTopic extends TopicDefinition {
  sources: RssSource[];
  keywords: string[];
  isCustom: true;
  createdAt: string;
}

const BUILT_IN_IDS = new Set(["ai", "technology", "stocks", "economy", "politics"]);
const MAX_SOURCES_PER_TOPIC = 10;
const MAX_CUSTOM_TOPICS = 20;

const customTopics = new Map<string, CustomTopic>();

export interface CreateCustomTopicInput {
  id: string;
  label: string;
  labelTh: string;
  keywords: string[];
  sources: RssSource[];
  icon?: string;
}

export type CreateCustomTopicResult =
  | { success: true; topic: CustomTopic }
  | { success: false; error: string };

export function createCustomTopic(
  input: CreateCustomTopicInput,
): CreateCustomTopicResult {
  if (!input.id || !/^[a-z0-9-]+$/.test(input.id)) {
    return { success: false, error: "Topic ID must be lowercase letters, numbers, and hyphens only" };
  }
  if (BUILT_IN_IDS.has(input.id)) {
    return { success: false, error: `"${input.id}" is a built-in topic and cannot be overridden` };
  }
  if (customTopics.has(input.id)) {
    return { success: false, error: `A custom topic with ID "${input.id}" already exists` };
  }
  if (customTopics.size >= MAX_CUSTOM_TOPICS) {
    return { success: false, error: `Maximum of ${MAX_CUSTOM_TOPICS} custom topics reached` };
  }
  if (!input.label.trim() || !input.labelTh.trim()) {
    return { success: false, error: "Both English and Thai labels are required" };
  }
  if (!input.sources || input.sources.length === 0) {
    return { success: false, error: "At least one RSS source is required" };
  }

  const topic: CustomTopic = {
    id: input.id,
    label: input.label.trim(),
    labelTh: input.labelTh.trim(),
    icon: input.icon ?? "layers",
    keywords: input.keywords.filter((k) => k.trim()),
    sources: input.sources.slice(0, MAX_SOURCES_PER_TOPIC),
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  customTopics.set(input.id, topic);
  return { success: true, topic };
}

export function getCustomTopics(): CustomTopic[] {
  return Array.from(customTopics.values());
}

export function getCustomTopicById(id: string): CustomTopic | undefined {
  return customTopics.get(id);
}

export function deleteCustomTopic(id: string): boolean {
  return customTopics.delete(id);
}

export function getCustomTopicCount(): number {
  return customTopics.size;
}
