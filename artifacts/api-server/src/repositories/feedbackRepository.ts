// ============================================================
// FEEDBACK REPOSITORY — Sprint 14 Task D
// ============================================================

import {
  db,
  feedbackActionsTable,
  type FeedbackAction,
  type InsertFeedbackAction,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";

export async function recordFeedback(action: InsertFeedbackAction): Promise<FeedbackAction | null> {
  try {
    const [result] = await db.insert(feedbackActionsTable).values(action).returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[FeedbackRepo] record failed");
    return null;
  }
}

export async function getFeedbackForProfile(
  profileId: string,
  limit = 200,
): Promise<FeedbackAction[]> {
  try {
    return await db
      .select()
      .from(feedbackActionsTable)
      .where(eq(feedbackActionsTable.profileId, profileId))
      .orderBy(desc(feedbackActionsTable.recordedAt))
      .limit(limit);
  } catch (err) {
    logger.warn({ err, profileId }, "[FeedbackRepo] get failed");
    return [];
  }
}

export async function getFeedbackStats(profileId: string): Promise<{
  opens: number;
  saves: number;
  skips: number;
  completeReads: number;
  thumbsUp: number;
  thumbsDown: number;
}> {
  try {
    const all = await getFeedbackForProfile(profileId, 1000);
    return {
      opens: all.filter((f) => f.feedbackType === "open").length,
      saves: all.filter((f) => f.feedbackType === "save").length,
      skips: all.filter((f) => f.feedbackType === "skip").length,
      completeReads: all.filter((f) => f.feedbackType === "complete_read").length,
      thumbsUp: all.filter((f) => f.feedbackType === "thumbs_up").length,
      thumbsDown: all.filter((f) => f.feedbackType === "thumbs_down").length,
    };
  } catch (err) {
    logger.warn({ err, profileId }, "[FeedbackRepo] stats failed");
    return { opens: 0, saves: 0, skips: 0, completeReads: 0, thumbsUp: 0, thumbsDown: 0 };
  }
}
