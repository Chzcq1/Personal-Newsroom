import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryLogsTable = pgTable("delivery_logs", {
  id: text("id").primaryKey(),
  profileId: text("profile_id"),
  briefingType: text("briefing_type").notNull(),
  channel: text("channel").notNull().default("telegram"),
  status: text("status").notNull(),
  topicsCount: integer("topics_count").default(0).notNull(),
  articleCount: integer("article_count").default(0).notNull(),
  aiTokensUsed: integer("ai_tokens_used").default(0).notNull(),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeliveryLogSchema = createInsertSchema(deliveryLogsTable).omit({
  createdAt: true,
});

export type InsertDeliveryLog = z.infer<typeof insertDeliveryLogSchema>;
export type DeliveryLog = typeof deliveryLogsTable.$inferSelect;
