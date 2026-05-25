export interface Region {
  id: string
  name: string
  timezone: string
  baseUrl: string
}

export interface ProviderRegionalAvailability {
  providerId: string
  region: Region
  slots: string[]
  syncedAt: Date
}

export type CacheStrategy = 'lru' | 'lfu'

export interface CacheConfig {
  ttl: number
  strategy: CacheStrategy
  maxSize: number
}
