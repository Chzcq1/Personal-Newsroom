import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const entityMemoryTable = pgTable("entity_memory", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  type: text("type").notNull(),
  totalMentions: integer("total_mentions").default(0).notNull(),
  mentions24h: integer("mentions_24h").default(0).notNull(),
  mentions7d: integer("mentions_7d").default(0).notNull(),
  trendDirection: text("trend_direction").default("stable").notNull(),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
});

export const insertEntityMemorySchema = createInsertSchema(entityMemoryTable).omit({
  firstSeen: true,
  lastSeen: true,
});

export type InsertEntityMemory = z.infer<typeof insertEntityMemorySchema>;
export type EntityMemory = typeof entityMemoryTable.$inferSelect;
