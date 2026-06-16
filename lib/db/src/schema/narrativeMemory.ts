import { pgTable, text, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const narrativeMemoryTable = pgTable("narrative_memory", {
  id: text("id").primaryKey(),
  canonicalHeadline: text("canonical_headline").notNull(),
  theme: text("theme").notNull(),
  dominantEntity: text("dominant_entity"),
  relatedEntities: jsonb("related_entities").$type<string[]>().default([]).notNull(),
  totalMentions: integer("total_mentions").default(0).notNull(),
  avgSignalScore: real("avg_signal_score").default(0).notNull(),
  peakScore: real("peak_score").default(0).notNull(),
  maturity: text("maturity").default("emerging").notNull(),
  sentiment: text("sentiment").default("neutral").notNull(),
  trendAcceleration: real("trend_acceleration").default(0).notNull(),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  developments: jsonb("developments").$type<Array<{
    headline: string;
    sources: string[];
    recordedAt: string;
    articleCount: number;
    signalScore: number;
  }>>().default([]).notNull(),
});

export const insertNarrativeMemorySchema = createInsertSchema(narrativeMemoryTable).omit({
  firstSeen: true,
  lastSeen: true,
});

export type InsertNarrativeMemory = z.infer<typeof insertNarrativeMemorySchema>;
export type NarrativeMemory = typeof narrativeMemoryTable.$inferSelect;
