// ============================================================
// WATCHLIST REPOSITORY — Sprint 22
// Manages user entity watchlists (stocks, crypto, people, topics).
// ============================================================

import { db, userWatchlistsTable, type UserWatchlist } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

type NewWatchlistItem = typeof userWatchlistsTable.$inferInsert;

export async function getWatchlist(profileId: string): Promise<UserWatchlist[]> {
  try {
    return await db
      .select()
      .from(userWatchlistsTable)
      .where(and(eq(userWatchlistsTable.profileId, profileId), eq(userWatchlistsTable.active, true)));
  } catch (err) {
    logger.warn({ err, profileId }, "[WatchlistRepo] getWatchlist failed");
    return [];
  }
}

export async function addToWatchlist(
  profileId: string,
  entityId: string,
  entityLabel: string,
  entityType: string,
): Promise<UserWatchlist | null> {
  try {
    const existing = await db
      .select()
      .from(userWatchlistsTable)
      .where(and(
        eq(userWatchlistsTable.profileId, profileId),
        eq(userWatchlistsTable.entityId, entityId),
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(userWatchlistsTable)
        .set({ active: true, entityLabel, entityType })
        .where(eq(userWatchlistsTable.id, existing[0].id))
        .returning();
      return updated ?? null;
    }

    const row: NewWatchlistItem = { profileId, entityId, entityLabel, entityType, active: true };
    const [inserted] = await db.insert(userWatchlistsTable).values(row).returning();
    return inserted ?? null;
  } catch (err) {
    logger.warn({ err, profileId, entityId }, "[WatchlistRepo] addToWatchlist failed");
    return null;
  }
}

export async function removeFromWatchlist(id: number): Promise<void> {
  try {
    await db
      .update(userWatchlistsTable)
      .set({ active: false })
      .where(eq(userWatchlistsTable.id, id));
  } catch (err) {
    logger.warn({ err, id }, "[WatchlistRepo] remove failed");
  }
}

export async function removeFromWatchlistByEntity(
  profileId: string,
  entityId: string,
): Promise<void> {
  try {
    await db
      .update(userWatchlistsTable)
      .set({ active: false })
      .where(and(
        eq(userWatchlistsTable.profileId, profileId),
        eq(userWatchlistsTable.entityId, entityId),
      ));
  } catch (err) {
    logger.warn({ err, profileId, entityId }, "[WatchlistRepo] removeByEntity failed");
  }
}
