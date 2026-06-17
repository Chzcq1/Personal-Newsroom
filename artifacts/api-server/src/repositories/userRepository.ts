import { db, usersTable, userSessionsTable, type User, type InsertUser } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger.js";

function generateId(): string {
  return crypto.randomUUID();
}

export async function createUser(data: Omit<InsertUser, "id">): Promise<User | null> {
  try {
    const [result] = await db
      .insert(usersTable)
      .values({ ...data, id: generateId() })
      .returning();
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[UserRepo] createUser failed");
    return null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const [result] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return result ?? null;
  } catch (err) {
    logger.warn({ err, id }, "[UserRepo] getUserById failed");
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const [result] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    return result ?? null;
  } catch (err) {
    logger.warn({ err, email }, "[UserRepo] getUserByEmail failed");
    return null;
  }
}

export async function getUserByAnonymousProfileId(profileId: string): Promise<User | null> {
  try {
    const [result] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.anonymousProfileId, profileId))
      .limit(1);
    return result ?? null;
  } catch (err) {
    logger.warn({ err }, "[UserRepo] getUserByAnonymousProfileId failed");
    return null;
  }
}

export async function updateUserLastLogin(id: string): Promise<void> {
  try {
    await db
      .update(usersTable)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  } catch (err) {
    logger.warn({ err }, "[UserRepo] updateUserLastLogin failed");
  }
}

export async function updateUser(id: string, patch: Partial<Pick<User, "displayName" | "avatarUrl" | "tier" | "role" | "foundingMember">>): Promise<void> {
  try {
    await db
      .update(usersTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(usersTable.id, id));
  } catch (err) {
    logger.warn({ err }, "[UserRepo] updateUser failed");
  }
}

export async function countUsers(): Promise<number> {
  try {
    const result = await db.select().from(usersTable);
    return result.length;
  } catch {
    return 0;
  }
}

export async function createSession(userId: string, deviceHint?: string): Promise<string | null> {
  try {
    const id = generateId();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(userSessionsTable).values({ id, userId, deviceHint, expiresAt });
    return id;
  } catch (err) {
    logger.warn({ err }, "[UserRepo] createSession failed");
    return null;
  }
}

export async function touchSession(sessionId: string): Promise<void> {
  try {
    await db
      .update(userSessionsTable)
      .set({ lastSeen: new Date() })
      .where(eq(userSessionsTable.id, sessionId));
  } catch (err) {
    logger.warn({ err }, "[UserRepo] touchSession failed");
  }
}

export async function deactivateSession(sessionId: string): Promise<void> {
  try {
    await db
      .update(userSessionsTable)
      .set({ isActive: false })
      .where(eq(userSessionsTable.id, sessionId));
  } catch (err) {
    logger.warn({ err }, "[UserRepo] deactivateSession failed");
  }
}

export async function isSessionValid(sessionId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select()
      .from(userSessionsTable)
      .where(and(eq(userSessionsTable.id, sessionId), eq(userSessionsTable.isActive, true)))
      .limit(1);
    if (!row) return false;
    return row.expiresAt > new Date();
  } catch {
    return false;
  }
}
