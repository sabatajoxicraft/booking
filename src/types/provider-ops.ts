import type { AvailabilitySlot, AvailabilitySlotId, AvailabilitySlotState } from '@/types/availability-slot'
import type { Booking, BookingId, BookingStatus } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

export interface ProviderBookingQueueItem {
  bookingId: BookingId
  customerId: CustomerId
  serviceId: ServiceId
  staffId: StaffId
  slotId: AvailabilitySlotId
  startIso: string
  endIso: string
  status: BookingStatus
}

export interface ProviderQueueGroup {
  status: BookingStatus
  label: string
  bookings: ProviderBookingQueueItem[]
}

export interface ProviderCalendarBookingItem {
  bookingId: BookingId
  startIso: string
  endIso: string
  customerId: CustomerId
  serviceId: ServiceId
  status: BookingStatus
}

export interface ProviderCalendarDayGroup {
  dateIso: string
  bookings: ProviderCalendarBookingItem[]
}

export interface ProviderAvailabilitySlotSnapshot {
  slotId: AvailabilitySlotId
  startIso: string
  endIso: string
  state: AvailabilitySlotState
  isBookable: boolean
}

export interface ProviderBookingsView {
  businessId: BusinessId
  generatedAtIso: string
  queueGroups: ProviderQueueGroup[]
  calendarDays: ProviderCalendarDayGroup[]
  slotSnapshots: ProviderAvailabilitySlotSnapshot[]
}

export interface ProviderActionAudit {
  actionId: string
  actionType: 'booking_status_update' | 'availability_slot_update'
  actorRole: 'provider'
  actorId: string
  reason: string
  atIso: string
  entityId: string
  changedFields: string[]
}

export interface ProviderBookingStatusUpdateInput {
  bookingId: BookingId
  nextStatus: BookingStatus
  actorId: string
  reason: string
}

export interface ProviderBookingActionResult {
  booking: Booking
  previousStatus: BookingStatus
  nextStatus: BookingStatus
  audit: ProviderActionAudit
}

export interface ProviderAvailabilitySlotStateUpdateInput {
  slotId: AvailabilitySlotId
  nextState: AvailabilitySlotState
  actorId: string
  reason: string
}

export interface ProviderAvailabilityActionResult {
  slot: AvailabilitySlot
  previousState: AvailabilitySlotState
  nextState: AvailabilitySlotState
  audit: ProviderActionAudit
}
