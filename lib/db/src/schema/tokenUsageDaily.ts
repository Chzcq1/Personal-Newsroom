import { pgTable, text, integer, real, date, timestamp } from "drizzle-orm/pg-core";

export const tokenUsageDailyTable = pgTable("token_usage_daily", {
  id: text("id").primaryKey(),
  date: date("date").notNull(),
  featureName: text("feature_name").notNull().default("unknown"),
  topicId: text("topic_id"),
  briefingType: text("briefing_type"),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  totalTokens: integer("total_tokens").default(0).notNull(),
  estimatedCostUsd: real("estimated_cost_usd").default(0).notNull(),
  briefingCount: integer("briefing_count").default(0).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TokenUsageDaily = typeof tokenUsageDailyTable.$inferSelect;
export type InsertTokenUsageDaily = typeof tokenUsageDailyTable.$inferInsert;
