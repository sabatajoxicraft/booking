import type { AvailabilityQuery, AvailabilitySlot } from '@/types/availability-slot'
import { detectDoubleBookingConflict, validateBookingTransition, validateSlotTransition, validateSlotBlockingWithBookings } from '@/lib/lifecycle'
import { fail, ok, type ApiResult } from '@/types/api'
import type {
  Booking,
  BookingId,
  BookingIntent,
  BookingStatus,
  CancelBookingInput,
  CreateBookingIntentInput,
} from '@/types/booking'
import type { BusinessSummary } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type {
  ProviderBookingActionResult,
  ProviderAvailabilityActionResult,
  ProviderAvailabilitySlotStateUpdateInput,
  ProviderBookingsView,
  ProviderBookingStatusUpdateInput,
} from '@/types/provider-ops'
import type { ServiceDefinition } from '@/types/service'
import type { StaffProfile } from '@/types/staff'
import type {
  AvailabilityQueryService,
  BookingService,
  CatalogDiscoveryService,
  ProviderOperationsService,
  ServiceRegistry,
} from '@/services/interfaces'

const businesses: BusinessSummary[] = [{ id: 'biz_main', name: 'Aurora Wellness Studio' }]

const services: ServiceDefinition[] = [
  {
    id: 'svc_consult',
    businessId: 'biz_main',
    name: 'Initial Consultation',
    durationMinutes: 45,
    priceCents: 65000,
    currency: 'ZAR',
    isBookable: true,
  },
]

const staffMembers: StaffProfile[] = [
  {
    id: 'stf_amy',
    businessId: 'biz_main',
    displayName: 'Amy Daniels',
    serviceIds: ['svc_consult'],
    isActive: true,
  },
]

const slots: AvailabilitySlot[] = [
  {
    id: 'slot_001',
    businessId: 'biz_main',
    serviceId: 'svc_consult',
    staffId: 'stf_amy',
    startIso: '2026-01-20T09:00:00.000Z',
    endIso: '2026-01-20T09:45:00.000Z',
    state: 'open',
    isBookable: true,
  },
  {
    id: 'slot_002',
    businessId: 'biz_main',
    serviceId: 'svc_consult',
    staffId: 'stf_amy',
    startIso: '2026-01-20T10:00:00.000Z',
    endIso: '2026-01-20T10:45:00.000Z',
    state: 'held',
    isBookable: false,
  },
  {
    id: 'slot_003',
    businessId: 'biz_main',
    serviceId: 'svc_consult',
    staffId: 'stf_amy',
    startIso: '2026-01-20T11:00:00.000Z',
    endIso: '2026-01-20T11:45:00.000Z',
    state: 'open',
    isBookable: true,
  },
]

const bookingRecords: Booking[] = [
  {
    id: 'bk_001',
    businessId: 'biz_main',
    serviceId: 'svc_consult',
    staffId: 'stf_amy',
    customerId: 'cus_demo',
    slotId: 'slot_001',
    startIso: '2026-01-20T09:00:00.000Z',
    endIso: '2026-01-20T09:45:00.000Z',
    status: 'confirmed',
  },
  {
    id: 'bk_002',
    businessId: 'biz_main',
    serviceId: 'svc_consult',
    staffId: 'stf_amy',
    customerId: 'cus_demo',
    slotId: 'slot_002',
    startIso: '2026-01-20T10:00:00.000Z',
    endIso: '2026-01-20T10:45:00.000Z',
    status: 'pending',
  },
]

const bookingStatusOrder: BookingStatus[] = ['pending', 'confirmed', 'cancelled']

// Helper: Synchronize slot state after booking status change
const synchronizeSlotStateAfterBookingStatusChange = (
  booking: Booking,
  previousStatus: BookingStatus,
  newStatus: BookingStatus,
): void => {
  const slot = slots.find((s) => s.id === booking.slotId)
  if (!slot) return

  // When a booking moves to cancelled, the slot should go from held to open
  if (newStatus === 'cancelled' && (previousStatus === 'pending' || previousStatus === 'confirmed')) {
    // Only release slot if no other active bookings exist for this slot
    const otherActiveBookings = bookingRecords.filter(
      (b) => b.slotId === booking.slotId && b.id !== booking.id && (b.status === 'pending' || b.status === 'confirmed'),
    )
    if (otherActiveBookings.length === 0 && slot.state === 'held') {
      slot.state = 'open'
      slot.isBookable = true
    }
  }
}

// Helper: Cascade-cancel all active bookings in a slot
const cascadeCancelBookingsInSlot = (slotId: string): BookingId[] => {
  const cancelledIds: BookingId[] = []
  bookingRecords.forEach((booking) => {
    if (booking.slotId === slotId && (booking.status === 'pending' || booking.status === 'confirmed')) {
      booking.status = 'cancelled'
      cancelledIds.push(booking.id)
    }
  })
  return cancelledIds
}

const catalog: CatalogDiscoveryService = {
  async listBusinesses(): Promise<ApiResult<BusinessSummary[]>> {
    return ok(businesses)
  },
  async listServicesByBusiness(businessId: string): Promise<ApiResult<ServiceDefinition[]>> {
    if (businessId === 'biz_missing') {
      return fail({ code: 'NOT_FOUND', message: 'Business not found' })
    }

    return ok(services.filter((service) => service.businessId === businessId))
  },
  async listStaffByBusiness(businessId: string): Promise<ApiResult<StaffProfile[]>> {
    if (businessId === 'biz_unavailable') {
      return fail({ code: 'UNAVAILABLE', message: 'Catalog unavailable for this business' })
    }

    return ok(staffMembers.filter((staffMember) => staffMember.businessId === businessId))
  },
}

const availability: AvailabilityQueryService = {
  async findAvailability(query: AvailabilityQuery): Promise<ApiResult<AvailabilitySlot[]>> {
    if (query.dateIso === '2099-01-01') {
      return fail({ code: 'UNAVAILABLE', message: 'No available times for this date. Please try another date.' })
    }

    return ok(
      slots.filter(
        (slot) =>
          slot.businessId === query.businessId &&
          slot.serviceId === query.serviceId &&
          slot.staffId === query.staffId &&
          slot.startIso.startsWith(query.dateIso),
      ),
    )
  },
}

const bookings: BookingService = {
  async listBookings(customerId: CustomerId): Promise<ApiResult<Booking[]>> {
    if (customerId === 'cus_missing') {
      return fail({ code: 'NOT_FOUND', message: 'Customer has no bookings' })
    }

    return ok(bookingRecords.filter((bookingRecord) => bookingRecord.customerId === customerId))
  },
  async getBooking(bookingId: BookingId): Promise<ApiResult<Booking>> {
    const bookingRecord = bookingRecords.find((record) => record.id === bookingId)

    if (!bookingRecord) {
      return fail({ code: 'NOT_FOUND', message: 'Booking not found' })
    }

    return ok(bookingRecord)
  },
  async createBookingIntent(input: CreateBookingIntentInput): Promise<ApiResult<BookingIntent>> {
    const slot = slots.find((s) => s.id === input.slotId)

    if (!slot) {
      return fail({ code: 'NOT_FOUND', message: 'Slot not found' })
    }

    if (!slot.isBookable) {
      return fail({ code: 'CONFLICT', message: 'Slot is no longer bookable' })
    }

    if (slot.businessId !== input.businessId) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Slot does not belong to the specified business' })
    }

    if (slot.serviceId !== input.serviceId) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Slot does not match the specified service' })
    }

    const conflictCheck = detectDoubleBookingConflict(input.slotId, bookingRecords)
    if (!conflictCheck.valid) {
      return fail({ code: 'CONFLICT', message: conflictCheck.violation.message })
    }

    return ok({
      intentId: `intent_${input.slotId}`,
      bookingDraft: input,
      expiresAtIso: '2026-01-20T08:55:00.000Z',
    })
  },
  async cancelBooking(input: CancelBookingInput): Promise<ApiResult<Booking>> {
    const booking = bookingRecords.find((record) => record.id === input.bookingId)
    if (!booking) {
      return fail({ code: 'NOT_FOUND', message: 'Booking not found' })
    }
    if (booking.customerId !== input.customerId) {
      return fail({ code: 'VALIDATION_ERROR', message: 'Booking does not belong to this customer' })
    }
    const transitionCheck = validateBookingTransition(booking.status, 'cancelled')
    if (!transitionCheck.valid) {
      return fail({ code: 'INVALID_TRANSITION', message: transitionCheck.violation.message })
    }
    const previousStatus = booking.status
    booking.status = 'cancelled'
    synchronizeSlotStateAfterBookingStatusChange(booking, previousStatus, booking.status)
    return ok(booking)
  },
}

const providerOps: ProviderOperationsService = {
  async getBookingsView(businessId: string): Promise<ApiResult<ProviderBookingsView>> {
    if (businessId === 'biz_unavailable') {
      return fail({ code: 'UNAVAILABLE', message: 'Provider queue is unavailable' })
    }

    const businessBookings = bookingRecords.filter((booking) => booking.businessId === businessId)

    const queueGroups = bookingStatusOrder.map((status) => ({
      status,
      label: status.charAt(0).toUpperCase() + status.slice(1),
      bookings: businessBookings
        .filter((booking) => booking.status === status)
        .map((booking) => ({
          bookingId: booking.id,
          customerId: booking.customerId,
          serviceId: booking.serviceId,
          staffId: booking.staffId,
          slotId: booking.slotId,
          startIso: booking.startIso,
          endIso: booking.endIso,
          status: booking.status,
        })),
    }))

    const calendarByDay = businessBookings.reduce<Record<string, ProviderBookingsView['calendarDays'][number]>>(
      (accumulator, booking) => {
        const dateIso = booking.startIso.split('T')[0]

        if (!accumulator[dateIso]) {
          accumulator[dateIso] = { dateIso, bookings: [] }
        }

        accumulator[dateIso].bookings.push({
          bookingId: booking.id,
          startIso: booking.startIso,
          endIso: booking.endIso,
          customerId: booking.customerId,
          serviceId: booking.serviceId,
          status: booking.status,
        })

        return accumulator
      },
      {},
    )

    const calendarDays = Object.values(calendarByDay).sort((left, right) =>
      left.dateIso.localeCompare(right.dateIso),
    )

    const slotSnapshots = slots
      .filter((slot) => slot.businessId === businessId)
      .map((slot) => ({
        slotId: slot.id,
        startIso: slot.startIso,
        endIso: slot.endIso,
        state: slot.state,
        isBookable: slot.isBookable,
      }))

    return ok({
      businessId,
      generatedAtIso: '2026-01-20T08:00:00.000Z',
      queueGroups,
      calendarDays,
      slotSnapshots,
    })
  },
  async updateBookingStatus(
    input: ProviderBookingStatusUpdateInput,
  ): Promise<ApiResult<ProviderBookingActionResult>> {
    const booking = bookingRecords.find((bookingRecord) => bookingRecord.id === input.bookingId)

    if (!booking) {
      return fail({ code: 'NOT_FOUND', message: 'Booking not found for provider update' })
    }

    const transitionCheck = validateBookingTransition(booking.status, input.nextStatus)
    if (!transitionCheck.valid && transitionCheck.violation.kind === 'terminal_state') {
      return fail({ code: 'INVALID_TRANSITION', message: transitionCheck.violation.message })
    }

    if (!transitionCheck.valid && transitionCheck.violation.kind === 'invalid_transition') {
      return fail({ code: 'INVALID_TRANSITION', message: transitionCheck.violation.message })
    }

    const previousStatus = booking.status
    booking.status = input.nextStatus
    synchronizeSlotStateAfterBookingStatusChange(booking, previousStatus, booking.status)

    return ok({
      booking,
      previousStatus,
      nextStatus: input.nextStatus,
      audit: {
        actionId: `audit_booking_${booking.id}_${input.nextStatus}`,
        actionType: 'booking_status_update',
        actorRole: 'provider',
        actorId: input.actorId,
        reason: input.reason,
        atIso: '2026-01-20T08:05:00.000Z',
        entityId: booking.id,
        changedFields: ['status'],
      },
    })
  },
  async updateAvailabilitySlotState(
    input: ProviderAvailabilitySlotStateUpdateInput,
  ): Promise<ApiResult<ProviderAvailabilityActionResult>> {
    const slot = slots.find((slotRecord) => slotRecord.id === input.slotId)

    if (!slot) {
      return fail({ code: 'NOT_FOUND', message: 'Slot not found for provider update' })
    }

    const transitionCheck = validateSlotTransition(slot.state, input.nextState)
    if (!transitionCheck.valid) {
      return fail({ code: 'INVALID_TRANSITION', message: transitionCheck.violation.message })
    }

    // Check if trying to block a held slot with active bookings
    if (input.nextState === 'blocked' && slot.state === 'held') {
      const blockingCheck = validateSlotBlockingWithBookings(input.slotId, bookingRecords)
      if (!blockingCheck.valid) {
        // Cascade-cancel all active bookings first
        cascadeCancelBookingsInSlot(input.slotId)
        const previousState = slot.state
        slot.state = input.nextState
        slot.isBookable = false

        return ok({
          slot,
          previousState,
          nextState: input.nextState,
          audit: {
            actionId: `audit_slot_${slot.id}_${input.nextState}`,
            actionType: 'availability_slot_update',
            actorRole: 'provider',
            actorId: input.actorId,
            reason: input.reason,
            atIso: '2026-01-20T08:10:00.000Z',
            entityId: slot.id,
            changedFields: ['state', 'isBookable'],
          },
        })
      }
    }

    const previousState = slot.state
    slot.state = input.nextState
    slot.isBookable = input.nextState === 'open'

    return ok({
      slot,
      previousState,
      nextState: input.nextState,
      audit: {
        actionId: `audit_slot_${slot.id}_${input.nextState}`,
        actionType: 'availability_slot_update',
        actorRole: 'provider',
        actorId: input.actorId,
        reason: input.reason,
        atIso: '2026-01-20T08:10:00.000Z',
        entityId: slot.id,
        changedFields: ['state', 'isBookable'],
      },
    })
  },
}

export const createMockServiceRegistry = (): ServiceRegistry => ({
  catalog,
  availability,
  bookings,
  providerOps,
})
