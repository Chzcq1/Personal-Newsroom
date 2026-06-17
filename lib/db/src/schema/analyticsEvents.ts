import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const analyticsEventsTable = pgTable("analytics_events", {
  id: text("id").primaryKey(),
  profileId: text("profile_id"),
  sessionId: text("session_id"),
  eventType: text("event_type").notNull(),
  properties: jsonb("properties").$type<Record<string, unknown>>().default({}).notNull(),
  url: text("url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = typeof analyticsEventsTable.$inferInsert;
