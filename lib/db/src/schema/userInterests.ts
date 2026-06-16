import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userInterestsTable = pgTable("user_interests", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  interestLabel: text("interest_label").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
});

export const insertUserInterestSchema = createInsertSchema(userInterestsTable).omit({
  id: true,
  addedAt: true,
});

export type InsertUserInterest = z.infer<typeof insertUserInterestSchema>;
export type UserInterest = typeof userInterestsTable.$inferSelect;
