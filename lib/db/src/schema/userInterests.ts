import { pgTable, text, boolean, timestamp, serial, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userInterestsTable = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  interestLabel: text("interest_label").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
  weight: integer("weight").default(50).notNull(),
  engagementScore: real("engagement_score").default(0).notNull(),
  lastInteraction: timestamp("last_interaction"),
});

export const insertUserInterestSchema = createInsertSchema(userInterestsTable).omit({
  id: true,
  addedAt: true,
});

export type InsertUserInterest = z.infer<typeof insertUserInterestSchema>;
export type UserInterest = typeof userInterestsTable.$inferSelect;
