// ============================================================
// INTEREST REPOSITORY — Sprint 22
// Manages user interest profiles with adaptive weight tracking.
// ============================================================

import { db, userInterestsTable, type UserInterest } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

type NewInterest = typeof userInterestsTable.$inferInsert;

export async function getInterests(profileId: string): Promise<UserInterest[]> {
  try {
    return await db
      .select()
      .from(userInterestsTable)
      .where(and(eq(userInterestsTable.profileId, profileId), eq(userInterestsTable.active, true)));
  } catch (err) {
    logger.warn({ err, profileId }, "[InterestRepo] getInterests failed");
    return [];
  }
}

export async function upsertInterest(
  profileId: string,
  label: string,
  weight = 50,
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(userInterestsTable)
      .where(and(
        eq(userInterestsTable.profileId, profileId),
        eq(userInterestsTable.interestLabel, label),
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userInterestsTable)
        .set({ active: true, weight, lastInteraction: new Date() })
        .where(eq(userInterestsTable.id, existing[0].id));
    } else {
      const row: NewInterest = {
        profileId,
        interestLabel: label,
        weight,
        engagementScore: 0,
        active: true,
      };
      await db.insert(userInterestsTable).values(row);
    }
  } catch (err) {
    logger.warn({ err, profileId, label }, "[InterestRepo] upsert failed");
  }
}

export async function setInterests(profileId: string, labels: string[]): Promise<void> {
  try {
    await db
      .update(userInterestsTable)
      .set({ active: false })
      .where(eq(userInterestsTable.profileId, profileId));
    for (const label of labels) {
      await upsertInterest(profileId, label, 50);
    }
  } catch (err) {
    logger.warn({ err, profileId }, "[InterestRepo] setInterests failed");
  }
}

/**
 * Apply a feedback delta to a topic's weight.
 * like: +10, dislike: -15, follow: +20, unfollow: -20
 */
export async function applyFeedback(
  profileId: string,
  label: string,
  delta: number,
): Promise<void> {
  try {
    const existing = await db
      .select()
      .from(userInterestsTable)
      .where(and(
        eq(userInterestsTable.profileId, profileId),
        eq(userInterestsTable.interestLabel, label),
      ))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      const newWeight = Math.max(0, Math.min(100, (current.weight ?? 50) + delta));
      const newEngagement = (current.engagementScore ?? 0) + Math.abs(delta) / 100;
      await db
        .update(userInterestsTable)
        .set({ weight: newWeight, engagementScore: newEngagement, lastInteraction: new Date() })
        .where(eq(userInterestsTable.id, current.id));
    } else if (delta > 0) {
      // Auto-create interest when user likes/follows something new
      await upsertInterest(profileId, label, Math.min(100, 50 + delta));
    }
  } catch (err) {
    logger.warn({ err, profileId, label }, "[InterestRepo] applyFeedback failed");
  }
}

export async function removeInterest(profileId: string, label: string): Promise<void> {
  try {
    await db
      .update(userInterestsTable)
      .set({ active: false })
      .where(and(
        eq(userInterestsTable.profileId, profileId),
        eq(userInterestsTable.interestLabel, label),
      ));
  } catch (err) {
    logger.warn({ err, profileId, label }, "[InterestRepo] remove failed");
  }
}
