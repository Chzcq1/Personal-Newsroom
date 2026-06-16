// ============================================================
// USER PROFILE REPOSITORY — Sprint 14 Task C
//
// Persists anonymous device identity to PostgreSQL.
// Falls back gracefully if DB is unavailable.
// ============================================================

import { db, userProfilesTable, type UserProfile, type InsertUserProfile } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function upsertProfile(profile: InsertUserProfile): Promise<UserProfile | null> {
  try {
    const now = new Date();
    const [result] = await db
      .insert(userProfilesTable)
      .values({ ...profile, lastSeen: now })
      .onConflictDoUpdate({
        target: userProfilesTable.id,
        set: {
          lastSeen: now,
          sessionCount: db.$count(userProfilesTable, eq(userProfilesTable.id, profile.id)),
          migrationReady: profile.migrationReady ?? false,
          metadata: profile.metadata ?? {},
        },
      })
      .returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[UserProfileRepo] upsert failed — continuing without persistence");
    return null;
  }
}

export async function getProfile(profileId: string): Promise<UserProfile | null> {
  try {
    const [result] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.id, profileId))
      .limit(1);
    return result ?? null;
  } catch (err) {
    logger.warn({ err, profileId }, "[UserProfileRepo] get failed");
    return null;
  }
}

export async function markOnboardingComplete(profileId: string): Promise<void> {
  try {
    await db
      .update(userProfilesTable)
      .set({ onboardingCompleted: true, lastSeen: new Date() })
      .where(eq(userProfilesTable.id, profileId));
  } catch (err) {
    logger.warn({ err, profileId }, "[UserProfileRepo] markOnboardingComplete failed");
  }
}

export async function markFoundingMember(profileId: string): Promise<void> {
  try {
    await db
      .update(userProfilesTable)
      .set({ foundingMember: true, lastSeen: new Date() })
      .where(eq(userProfilesTable.id, profileId));
  } catch (err) {
    logger.warn({ err, profileId }, "[UserProfileRepo] markFoundingMember failed");
  }
}

export async function getAllProfiles(): Promise<UserProfile[]> {
  try {
    return await db.select().from(userProfilesTable).orderBy(userProfilesTable.lastSeen);
  } catch (err) {
    logger.warn({ err }, "[UserProfileRepo] getAllProfiles failed");
    return [];
  }
}

export async function getProfileCount(): Promise<number> {
  try {
    const result = await db.$count(userProfilesTable);
    return result;
  } catch (err) {
    logger.warn({ err }, "[UserProfileRepo] count failed");
    return 0;
  }
}
