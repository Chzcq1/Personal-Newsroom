// ============================================================
// SAVED BRIEFING REPOSITORY — Sprint 14 Task D
// ============================================================

import { db, savedBriefingsTable, type SavedBriefing, type InsertSavedBriefing } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function saveBriefing(briefing: InsertSavedBriefing): Promise<SavedBriefing | null> {
  try {
    const [result] = await db
      .insert(savedBriefingsTable)
      .values(briefing)
      .onConflictDoUpdate({
        target: savedBriefingsTable.id,
        set: {
          content: briefing.content,
          articleCount: briefing.articleCount,
          sources: briefing.sources,
          metadata: briefing.metadata,
        },
      })
      .returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[SavedBriefingRepo] save failed");
    return null;
  }
}

export async function getBriefingsForProfile(
  profileId: string,
  limit = 50,
): Promise<SavedBriefing[]> {
  try {
    return await db
      .select()
      .from(savedBriefingsTable)
      .where(eq(savedBriefingsTable.profileId, profileId))
      .orderBy(desc(savedBriefingsTable.savedAt))
      .limit(limit);
  } catch (err) {
    logger.warn({ err, profileId }, "[SavedBriefingRepo] get failed");
    return [];
  }
}

export async function deleteBriefing(briefingId: string): Promise<boolean> {
  try {
    await db.delete(savedBriefingsTable).where(eq(savedBriefingsTable.id, briefingId));
    return true;
  } catch (err) {
    logger.warn({ err, briefingId }, "[SavedBriefingRepo] delete failed");
    return false;
  }
}

export async function getBriefingCount(profileId: string): Promise<number> {
  try {
    return await db.$count(savedBriefingsTable, eq(savedBriefingsTable.profileId, profileId));
  } catch (err) {
    logger.warn({ err }, "[SavedBriefingRepo] count failed");
    return 0;
  }
}
