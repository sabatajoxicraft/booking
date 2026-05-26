import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { BusinessId } from '@/types/business'
import type { CustomerId, CustomerProfileInput } from '@/types/customer'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

export type BookingId = string

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled'

export type CancellationReason =
  | 'customer_requested'
  | 'customer_no_show'
  | 'provider_cancelled'
  | 'provider_no_capacity'
  | 'booking_expired'
  | 'conflict_resolution'
  | 'system_error'

export interface Booking {
  id: BookingId
  businessId: BusinessId
  serviceId: ServiceId
  staffId: StaffId
  customerId: CustomerId
  slotId: AvailabilitySlotId
  startIso: string
  endIso: string
  status: BookingStatus
}

export interface CreateBookingIntentInput {
  businessId: BusinessId
  serviceId: ServiceId
  slotId: AvailabilitySlotId
  customerId: CustomerId
  customerDetails: CustomerProfileInput
}

export interface CancelBookingInput {
  bookingId: BookingId
  customerId: CustomerId
  reason: CancellationReason
}

export interface BookingIntent {
  intentId: string
  bookingDraft: CreateBookingIntentInput
  expiresAtIso: string
}
