// ============================================================
// STORAGE ABSTRACTION — Sprint 14 Task B
//
// Generic repository interface that allows swapping between:
//   in-memory → PostgreSQL → Redis/distributed
// without rewriting business logic in services.
// ============================================================

export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: K, partial: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

export interface IPaginatedRepository<T, K = string> extends IRepository<T, K> {
  findPage(opts: { limit: number; offset: number; filter?: Partial<T> }): Promise<{
    items: T[];
    total: number;
  }>;
}

export interface ITimeSeriesRepository<T, K = string> extends IRepository<T, K> {
  findRecent(limit: number): Promise<T[]>;
  findByDateRange(from: Date, to: Date): Promise<T[]>;
  pruneExpired(): Promise<number>;
}

// ── Storage backend tag — lets callers know what's backing a repo ──

export type StorageBackend = "memory" | "postgresql" | "redis";

export interface IRepositoryMeta {
  backend: StorageBackend;
  tableName?: string;
}
