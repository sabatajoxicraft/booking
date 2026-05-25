import type { Region, ProviderRegionalAvailability } from '@/types/scale'
import { LocalMemoryCache, getCacheKey } from '@/services/cache-layer'

export class MultiRegionService {
  private cache = new LocalMemoryCache<ProviderRegionalAvailability>({
    ttl: 300000,
    strategy: 'lru',
    maxSize: 5000,
  })

  private regions: Map<string, Region> = new Map()
  private providerAvailability: Map<string, ProviderRegionalAvailability> = new Map()

  constructor() {
    this.initializeRegions()
  }

  private initializeRegions(): void {
    const defaultRegions: Region[] = [
      {
        id: 'region_us_east',
        name: 'US East',
        timezone: 'America/New_York',
        baseUrl: 'https://api.us-east.booking.local',
      },
      {
        id: 'region_eu_west',
        name: 'EU West',
        timezone: 'Europe/London',
        baseUrl: 'https://api.eu-west.booking.local',
      },
      {
        id: 'region_za_south',
        name: 'South Africa',
        timezone: 'Africa/Johannesburg',
        baseUrl: 'https://api.za-south.booking.local',
      },
    ]

    defaultRegions.forEach((region) => {
      this.regions.set(region.id, region)
    })
  }

  async syncProviderAvailability(
    providerId: string,
    regions: Region[],
  ): Promise<ProviderRegionalAvailability[]> {
    const results: ProviderRegionalAvailability[] = []

    for (const region of regions) {
      const cacheKey = getCacheKey('provider_availability', `${providerId}:${region.id}`)
      let availability = this.cache.get(cacheKey)

      if (!availability) {
        availability = {
          providerId,
          region,
          slots: this.generateMockSlots(providerId),
          syncedAt: new Date(),
        }
        this.cache.set(cacheKey, availability)
        this.providerAvailability.set(cacheKey, availability)
      }

      results.push(availability)
    }

    return results
  }

  async getAvailableProvidersInRegion(
    region: Region,
  ): Promise<ProviderRegionalAvailability[]> {
    const providers = Array.from(this.providerAvailability.values()).filter(
      (prov) => prov.region.id === region.id && prov.slots.length > 0,
    )

    if (providers.length > 0) {
      return providers
    }

    return this.getAvailableProvidersInRegionWithFallback(region)
  }

  private async getAvailableProvidersInRegionWithFallback(
    region: Region,
  ): Promise<ProviderRegionalAvailability[]> {
    const alternateRegions = Array.from(this.regions.values()).filter((r) => r.id !== region.id)

    for (const altRegion of alternateRegions) {
      const providers = Array.from(this.providerAvailability.values()).filter(
        (prov) => prov.region.id === altRegion.id && prov.slots.length > 0,
      )

      if (providers.length > 0) {
        return providers
      }
    }

    return []
  }

  getRegion(regionId: string): Region | undefined {
    return this.regions.get(regionId)
  }

  getAllRegions(): Region[] {
    return Array.from(this.regions.values())
  }

  private generateMockSlots(providerId: string): string[] {
    return [`slot_${providerId}_001`, `slot_${providerId}_002`, `slot_${providerId}_003`]
  }
}
