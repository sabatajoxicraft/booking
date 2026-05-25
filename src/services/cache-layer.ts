import type { CacheConfig } from '@/types/scale'

export abstract class CacheAdapter<T> {
  abstract get(key: string): T | undefined
  abstract set(key: string, value: T): void
  abstract delete(key: string): void
  abstract clear(): void
  abstract has(key: string): boolean
}

interface CacheEntry<T> {
  value: T
  timestamp: number
  accessCount: number
}

export class LocalMemoryCache<T> extends CacheAdapter<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private config: CacheConfig

  constructor(config: CacheConfig = { ttl: 3600000, strategy: 'lru', maxSize: 1000 }) {
    super()
    this.config = config
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    const now = Date.now()
    if (now - entry.timestamp > this.config.ttl) {
      this.cache.delete(key)
      return undefined
    }

    entry.accessCount++
    return entry.value
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.config.maxSize) {
      this.evict()
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 0,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== undefined
  }

  private evict(): void {
    if (this.config.strategy === 'lru') {
      this.evictLRU()
    } else if (this.config.strategy === 'lfu') {
      this.evictLFU()
    }
  }

  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private evictLFU(): void {
    let leastUsedKey: string | null = null
    let leastAccessCount = Number.MAX_SAFE_INTEGER

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastAccessCount) {
        leastAccessCount = entry.accessCount
        leastUsedKey = key
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
    }
  }
}

export type CacheInvalidationPolicy = 'time-based' | 'event-based' | 'hybrid'

export function getCacheKey(namespace: string, id: string): string {
  return `${namespace}:${id}`
}
