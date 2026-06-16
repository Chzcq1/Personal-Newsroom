import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userProfilesTable = pgTable("user_profiles", {
  id: text("id").primaryKey(),
  deviceFingerprint: text("device_fingerprint"),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  sessionCount: integer("session_count").default(0).notNull(),
  timezone: text("timezone").default("Asia/Bangkok").notNull(),
  language: text("language").default("th").notNull(),
  migrationReady: boolean("migration_ready").default(false).notNull(),
  foundingMember: boolean("founding_member").default(false).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  firstSeen: true,
  lastSeen: true,
});

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;
