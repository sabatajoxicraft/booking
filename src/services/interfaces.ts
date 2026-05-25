import type { AvailabilityQuery, AvailabilitySlot } from '@/types/availability-slot'
import type { ApiResult } from '@/types/api'
import type { Booking, BookingId, BookingIntent, CancelBookingInput, CreateBookingIntentInput } from '@/types/booking'
import type { BusinessSummary } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { BookingLifecycleEvent, BookingNotification } from '@/types/notification'
import type { PaymentOutcome, PaymentRequest } from '@/types/payment'
import type {
  ProviderAvailabilityActionResult,
  ProviderAvailabilitySlotStateUpdateInput,
  ProviderBookingActionResult,
  ProviderBookingsView,
  ProviderBookingStatusUpdateInput,
} from '@/types/provider-ops'
import type { ServiceDefinition } from '@/types/service'
import type { StaffProfile } from '@/types/staff'

export interface CatalogDiscoveryService {
  listBusinesses(): Promise<ApiResult<BusinessSummary[]>>
  listServicesByBusiness(businessId: string): Promise<ApiResult<ServiceDefinition[]>>
  listStaffByBusiness(businessId: string): Promise<ApiResult<StaffProfile[]>>
}

export interface AvailabilityQueryService {
  findAvailability(query: AvailabilityQuery): Promise<ApiResult<AvailabilitySlot[]>>
}

export interface BookingService {
  listBookings(customerId: CustomerId): Promise<ApiResult<Booking[]>>
  getBooking(bookingId: BookingId): Promise<ApiResult<Booking>>
  createBookingIntent(input: CreateBookingIntentInput): Promise<ApiResult<BookingIntent>>
  cancelBooking(input: CancelBookingInput): Promise<ApiResult<Booking>>
}

export interface ProviderOperationsService {
  getBookingsView(businessId: string): Promise<ApiResult<ProviderBookingsView>>
  updateBookingStatus(
    input: ProviderBookingStatusUpdateInput,
  ): Promise<ApiResult<ProviderBookingActionResult>>
  updateAvailabilitySlotState(
    input: ProviderAvailabilitySlotStateUpdateInput,
  ): Promise<ApiResult<ProviderAvailabilityActionResult>>
}

export interface PaymentService {
  processPayment(input: PaymentRequest): Promise<ApiResult<PaymentOutcome>>
}

export interface NotificationService {
  publishBookingLifecycleEvent(input: BookingLifecycleEvent): Promise<ApiResult<BookingNotification>>
}

export interface ServiceRegistry {
  catalog: CatalogDiscoveryService
  availability: AvailabilityQueryService
  bookings: BookingService
  providerOps: ProviderOperationsService
  payments: PaymentService
  notifications: NotificationService
}
