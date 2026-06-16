import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryQueueTable = pgTable("delivery_queue", {
  id: text("id").primaryKey(),
  digestId: text("digest_id").notNull(),
  briefingType: text("briefing_type").notNull(),
  rawText: text("raw_text").notNull(),
  formattedMessages: jsonb("formatted_messages").$type<string[]>().default([]).notNull(),
  articleCount: integer("article_count").default(0).notNull(),
  topicsUsed: jsonb("topics_used").$type<string[]>().default([]).notNull(),
  status: text("status").default("pending").notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  maxRetries: integer("max_retries").default(3).notNull(),
  nextAttemptAt: timestamp("next_attempt_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
});

export const insertDeliveryQueueSchema = createInsertSchema(deliveryQueueTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliveryQueue = z.infer<typeof insertDeliveryQueueSchema>;
export type DeliveryQueueItem = typeof deliveryQueueTable.$inferSelect;
