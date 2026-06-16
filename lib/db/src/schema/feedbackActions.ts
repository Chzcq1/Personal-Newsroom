import { pgTable, text, timestamp, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedbackActionsTable = pgTable("feedback_actions", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id"),
  articleUrl: text("article_url").notNull(),
  articleTitle: text("article_title").notNull(),
  feedbackType: text("feedback_type").notNull(),
  entities: jsonb("entities").$type<string[]>().default([]).notNull(),
  topicId: text("topic_id").notNull(),
  narrativeId: text("narrative_id"),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const insertFeedbackActionSchema = createInsertSchema(feedbackActionsTable).omit({
  id: true,
  recordedAt: true,
});

export type InsertFeedbackAction = z.infer<typeof insertFeedbackActionSchema>;
export type FeedbackAction = typeof feedbackActionsTable.$inferSelect;
