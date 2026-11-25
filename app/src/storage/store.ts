// Storage layer — ADR-0001.
//
// The app talks to `Collection<T>`; it never touches localStorage directly. The interface is
// async even though localStorage is synchronous, so that a Neon-backed implementation can be
// dropped in later without rewriting a single call site.
//
// Two invariants this file exists to hold:
//  1. Nothing read back is trusted until it parses (records are user data, the schema evolves).
//  2. User data is never silently destroyed. A record that fails validation is quarantined
//     under its own key, not dropped — a job-search tracker that loses its history is worse
//     than one that crashes.
import type { z } from 'zod'

export interface KeyValueBackend {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export interface Collection<T extends { id: string }> {
  list(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  upsert(item: T): Promise<T>
  remove(id: string): Promise<void>
  /** Replace the whole collection (used by backup import). */
  replaceAll(items: T[]): Promise<void>
}

export const NAMESPACE = 'jsh:v1'

export function browserBackend(storage: Storage = window.localStorage): KeyValueBackend {
  return {
    getItem: (k) => storage.getItem(k),
    setItem: (k, v) => storage.setItem(k, v),
    removeItem: (k) => storage.removeItem(k),
    keys: () => Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((k): k is string => k !== null),
  }
}

export function memoryBackend(initial: Record<string, string> = {}): KeyValueBackend {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    keys: () => [...map.keys()],
  }
}

export interface QuarantineReport {
  collection: string
  key: string
  count: number
}

export function localCollection<S extends z.ZodType<{ id: string }>>(
  backend: KeyValueBackend,
  name: string,
  schema: S,
  onQuarantine: (r: QuarantineReport) => void = () => {},
): Collection<z.infer<S>> {
  type T = z.infer<S>
  const key = `${NAMESPACE}:${name}`

  const readAll = (): T[] => {
    const raw = backend.getItem(key)
    if (raw === null) return []
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      quarantine([raw])
      backend.removeItem(key)
      return []
    }
    if (!Array.isArray(parsed)) {
      quarantine([parsed])
      backend.removeItem(key)
      return []
    }
    const good: T[] = []
    const bad: unknown[] = []
    for (const entry of parsed) {
      const r = schema.safeParse(entry)
      if (r.success) good.push(r.data)
      else bad.push(entry)
    }
    if (bad.length > 0) {
      quarantine(bad)
      writeAll(good) // keep the good rows readable; the bad ones are preserved in quarantine
    }
    return good
  }

  const quarantine = (entries: unknown[]) => {
    const qKey = `${key}:quarantine:${Date.now()}`
    backend.setItem(qKey, JSON.stringify(entries))
    onQuarantine({ collection: name, key: qKey, count: entries.length })
  }

  const writeAll = (items: T[]) => backend.setItem(key, JSON.stringify(items))

  return {
    list: async () => readAll(),
    get: async (id) => readAll().find((x) => x.id === id),
    upsert: async (item) => {
      const valid = schema.parse(item)
      const all = readAll()
      const i = all.findIndex((x) => x.id === valid.id)
      if (i >= 0) all[i] = valid
      else all.push(valid)
      writeAll(all)
      return valid
    },
    remove: async (id) => writeAll(readAll().filter((x) => x.id !== id)),
    replaceAll: async (items) => writeAll(items.map((x) => schema.parse(x))),
  }
}
