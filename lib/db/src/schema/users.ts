import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  provider: text("provider", { enum: ["anonymous", "email", "google"] })
    .notNull()
    .default("anonymous"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  tier: text("tier", { enum: ["free", "founding_member", "premium_future"] })
    .notNull()
    .default("free"),
  foundingMember: boolean("founding_member").notNull().default(false),
  waitlistPosition: integer("waitlist_position"),
  founderCode: text("founder_code"),
  anonymousProfileId: text("anonymous_profile_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
