import { pgTable, text, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userWatchlistsTable = pgTable("user_watchlists", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull(),
  entityId: text("entity_id").notNull(),
  entityLabel: text("entity_label").notNull(),
  entityType: text("entity_type").default("general").notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  active: boolean("active").default(true).notNull(),
});

export const insertUserWatchlistSchema = createInsertSchema(userWatchlistsTable).omit({
  id: true,
  addedAt: true,
});

export type InsertUserWatchlist = z.infer<typeof insertUserWatchlistSchema>;
export type UserWatchlist = typeof userWatchlistsTable.$inferSelect;
