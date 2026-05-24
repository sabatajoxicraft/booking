import type { BusinessId } from '@/types/business'
import type { ServiceId } from '@/types/service'

export type StaffId = string

export interface StaffProfile {
  id: StaffId
  businessId: BusinessId
  displayName: string
  serviceIds: ServiceId[]
  isActive: boolean
}
