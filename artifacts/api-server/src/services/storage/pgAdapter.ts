// ============================================================
// POSTGRESQL ADAPTER — Sprint 14 Task B
//
// Thin utility helpers for Drizzle ORM repository implementations.
// Repositories extend this rather than re-implementing boilerplate.
//
// Usage:
//   import { db } from "@workspace/db";
//   import { userProfilesTable } from "@workspace/db";
//   import { eq } from "drizzle-orm";
// ============================================================

import type { IRepositoryMeta, StorageBackend } from "./IRepository.js";

export const PG_META: IRepositoryMeta = {
  backend: "postgresql" as StorageBackend,
};

/**
 * Build a "where clause" map from a partial filter object.
 * Drizzle handles this natively; this helper logs intent.
 */
export function buildFilter<T extends Record<string, unknown>>(
  filter: Partial<T>,
): [keyof T, T[keyof T]][] {
  return Object.entries(filter) as [keyof T, T[keyof T]][];
}

/**
 * Truncate array to max size (ring buffer for DB query results).
 */
export function ringSlice<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  return arr.slice(arr.length - max);
}
