import type { AvailabilitySlotId, AvailabilitySlotState } from '@/types/availability-slot'
import type { Booking, BookingId, BookingStatus } from '@/types/booking'

export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, ReadonlySet<BookingStatus>>> = {
  pending: new Set<BookingStatus>(['confirmed', 'cancelled']),
  confirmed: new Set<BookingStatus>(['cancelled']),
  cancelled: new Set<BookingStatus>(),
}

export const SLOT_TRANSITIONS: Readonly<Record<AvailabilitySlotState, ReadonlySet<AvailabilitySlotState>>> = {
  open: new Set<AvailabilitySlotState>(['held', 'blocked']),
  held: new Set<AvailabilitySlotState>(['open']),
  blocked: new Set<AvailabilitySlotState>(['open']),
}

export const BOOKING_TERMINAL_STATES = new Set<BookingStatus>(['cancelled'])

export type BookingTransitionViolation =
  | { kind: 'terminal_state'; current: BookingStatus; attempted: BookingStatus; message: string }
  | { kind: 'invalid_transition'; from: BookingStatus; to: BookingStatus; message: string }

export type SlotTransitionViolation = {
  kind: 'invalid_transition'
  from: AvailabilitySlotState
  to: AvailabilitySlotState
  message: string
}

export type SlotBlockingViolation = {
  kind: 'held_slot_with_active_bookings'
  slotId: AvailabilitySlotId
  bookingIds: BookingId[]
  message: string
}

export type BookingConflictViolation = {
  kind: 'double_booking_conflict'
  slotId: AvailabilitySlotId
  conflictingBookingId: BookingId
  message: string
}

export type LifecycleCheckResult<TViolation> = { valid: true } | { valid: false; violation: TViolation }

export const validateBookingTransition = (
  from: BookingStatus,
  to: BookingStatus,
): LifecycleCheckResult<BookingTransitionViolation> => {
  if (BOOKING_TERMINAL_STATES.has(from)) {
    return {
      valid: false,
      violation: {
        kind: 'terminal_state',
        current: from,
        attempted: to,
        message: `Booking is in terminal state ${from} and cannot transition to ${to}`,
      },
    }
  }

  if (BOOKING_TRANSITIONS[from].has(to)) {
    return { valid: true }
  }

  return {
    valid: false,
    violation: {
      kind: 'invalid_transition',
      from,
      to,
      message: `Invalid booking transition from ${from} to ${to}`,
    },
  }
}

export const validateSlotTransition = (
  from: AvailabilitySlotState,
  to: AvailabilitySlotState,
): LifecycleCheckResult<SlotTransitionViolation> => {
  if (SLOT_TRANSITIONS[from].has(to)) {
    return { valid: true }
  }

  return {
    valid: false,
    violation: {
      kind: 'invalid_transition',
      from,
      to,
      message: `Invalid slot transition from ${from} to ${to}`,
    },
  }
}

export const detectDoubleBookingConflict = (
  slotId: AvailabilitySlotId,
  bookings: readonly Booking[],
): LifecycleCheckResult<BookingConflictViolation> => {
  const conflictingBooking = bookings.find(
    (booking) => booking.slotId === slotId && (booking.status === 'confirmed' || booking.status === 'pending'),
  )

  if (!conflictingBooking) {
    return { valid: true }
  }

  return {
    valid: false,
    violation: {
      kind: 'double_booking_conflict',
      slotId,
      conflictingBookingId: conflictingBooking.id,
      message: `Slot ${slotId} is already reserved by booking ${conflictingBooking.id}`,
    },
  }
}

export const validateSlotBlockingWithBookings = (
  slotId: AvailabilitySlotId,
  bookings: readonly Booking[],
): LifecycleCheckResult<SlotBlockingViolation> => {
  const activeBookings = bookings.filter(
    (booking) => booking.slotId === slotId && (booking.status === 'confirmed' || booking.status === 'pending'),
  )

  if (activeBookings.length === 0) {
    return { valid: true }
  }

  return {
    valid: false,
    violation: {
      kind: 'held_slot_with_active_bookings',
      slotId,
      bookingIds: activeBookings.map((b) => b.id),
      message: `Cannot block slot ${slotId} with ${activeBookings.length} active booking(s). Must cascade-cancel first.`,
    },
  }
}
