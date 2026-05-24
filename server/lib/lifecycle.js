const BOOKING_TRANSITIONS = {
  pending: new Set(['confirmed', 'cancelled']),
  confirmed: new Set(['cancelled']),
  cancelled: new Set(),
};

const SLOT_TRANSITIONS = {
  open: new Set(['held', 'blocked']),
  held: new Set(['open', 'blocked']),
  blocked: new Set(['open']),
};

const BOOKING_TERMINAL_STATES = new Set(['cancelled']);

function validateBookingTransition(from, to) {
  if (BOOKING_TERMINAL_STATES.has(from)) {
    return {
      valid: false,
      violation: {
        kind: 'terminal_state',
        current: from,
        attempted: to,
        message: `Booking is in terminal state ${from} and cannot transition to ${to}`,
      },
    };
  }

  if (BOOKING_TRANSITIONS[from] && BOOKING_TRANSITIONS[from].has(to)) {
    return { valid: true };
  }

  return {
    valid: false,
    violation: {
      kind: 'invalid_transition',
      from,
      to,
      message: `Invalid booking transition from ${from} to ${to}`,
    },
  };
}

function validateSlotTransition(from, to) {
  if (SLOT_TRANSITIONS[from] && SLOT_TRANSITIONS[from].has(to)) {
    return { valid: true };
  }

  return {
    valid: false,
    violation: {
      kind: 'invalid_transition',
      from,
      to,
      message: `Invalid slot transition from ${from} to ${to}`,
    },
  };
}

function detectDoubleBookingConflict(slotId, bookings) {
  const conflictingBooking = bookings.find(
    (booking) => booking.slotId === slotId && (booking.status === 'confirmed' || booking.status === 'pending')
  );

  if (!conflictingBooking) {
    return { valid: true };
  }

  return {
    valid: false,
    violation: {
      kind: 'double_booking_conflict',
      slotId,
      conflictingBookingId: conflictingBooking.id,
      message: `Slot ${slotId} is already reserved by booking ${conflictingBooking.id}`,
    },
  };
}

module.exports = {
  BOOKING_TRANSITIONS,
  SLOT_TRANSITIONS,
  BOOKING_TERMINAL_STATES,
  validateBookingTransition,
  validateSlotTransition,
  detectDoubleBookingConflict,
};
