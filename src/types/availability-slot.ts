import type { BusinessId } from '@/types/business'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

export type AvailabilitySlotId = string

export type AvailabilitySlotState = 'open' | 'held' | 'blocked'

export interface AvailabilitySlot {
  id: AvailabilitySlotId
  businessId: BusinessId
  serviceId: ServiceId
  staffId: StaffId
  startIso: string
  endIso: string
  state: AvailabilitySlotState
  isBookable: boolean
}

export interface AvailabilityQuery {
  businessId: BusinessId
  serviceId: ServiceId
  staffId: StaffId
  dateIso: string
}
