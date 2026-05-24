import type { BusinessId } from '@/types/business'

export type ServiceId = string

export interface ServiceDefinition {
  id: ServiceId
  businessId: BusinessId
  name: string
  durationMinutes: number
  priceCents: number
  currency: 'ZAR'
  isBookable: boolean
}
