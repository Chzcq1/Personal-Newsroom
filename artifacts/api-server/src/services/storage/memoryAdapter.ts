// ============================================================
// IN-MEMORY ADAPTER — Sprint 14 Task B
//
// Drop-in IRepository backed by a Map. Used when:
//   - DATABASE_URL is not set
//   - Unit tests / local dev
//   - Temporary state (caches, ring buffers)
//
// Swap for postgresAdapter by returning the pg implementation
// from the repository factory without touching business logic.
// ============================================================

import type { IRepository, IRepositoryMeta, StorageBackend } from "./IRepository.js";

export class MemoryAdapter<T extends Record<string, unknown>, K extends string = string>
  implements IRepository<T, K>
{
  private store = new Map<K, T>();
  readonly meta: IRepositoryMeta = { backend: "memory" as StorageBackend };

  constructor(private readonly idField: keyof T = "id" as keyof T) {}

  async findById(id: K): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    const all = Array.from(this.store.values());
    if (!filter) return all;
    return all.filter((item) =>
      Object.entries(filter).every(([k, v]) => item[k] === v),
    );
  }

  async save(entity: T): Promise<T> {
    const id = entity[this.idField] as unknown as K;
    this.store.set(id, entity);
    return entity;
  }

  async update(id: K, partial: Partial<T>): Promise<T | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: K): Promise<boolean> {
    return this.store.delete(id);
  }

  async count(filter?: Partial<T>): Promise<number> {
    return (await this.findAll(filter)).length;
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
