import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  priceThb: integer("price_thb").notNull().default(0),
  feedRefreshIntervalSec: integer("feed_refresh_interval_sec").notNull().default(300),
  maxDailySummaries: integer("max_daily_summaries").notNull().default(5),
  telegramDelivery: boolean("telegram_delivery").notNull().default(false),
  maxWatchlistItems: integer("max_watchlist_items").notNull().default(5),
  fullSummaries: boolean("full_summaries").notNull().default(false),
  realtimePriority: boolean("realtime_priority").notNull().default(false),
  premiumIntelligence: boolean("premium_intelligence").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
