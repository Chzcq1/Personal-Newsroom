import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedBriefingsTable = pgTable("saved_briefings", {
  id: text("id").primaryKey(),
  profileId: text("profile_id"),
  topicId: text("topic_id").notNull(),
  topicLabel: text("topic_label").notNull(),
  content: text("content").notNull(),
  articleCount: integer("article_count").default(0).notNull(),
  sources: jsonb("sources").$type<string[]>().default([]).notNull(),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
});

export const insertSavedBriefingSchema = createInsertSchema(savedBriefingsTable).omit({
  savedAt: true,
});

export type InsertSavedBriefing = z.infer<typeof insertSavedBriefingSchema>;
export type SavedBriefing = typeof savedBriefingsTable.$inferSelect;
