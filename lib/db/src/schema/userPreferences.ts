import { pgTable, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPreferencesTable = pgTable("user_preferences", {
  profileId: text("profile_id").primaryKey(),
  lastViewedTopicId: text("last_viewed_topic_id"),
  favoriteTopicIds: jsonb("favorite_topic_ids").$type<string[]>().default([]).notNull(),
  personality: text("personality").default("analyst").notNull(),
  executiveMode: boolean("executive_mode").default(false).notNull(),
  darkMode: boolean("dark_mode").default(false).notNull(),
  feedDensity: text("feed_density").default("comfortable").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferencesTable).omit({
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferencesTable.$inferSelect;
