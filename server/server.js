const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('./db/database');
const {
  validateBookingTransition,
  validateSlotTransition,
  detectDoubleBookingConflict,
} = require('./lib/lifecycle');

const app = express();
const db = getDb();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(process.env.CORS_ORIGIN ? cors({ origin: process.env.CORS_ORIGIN }) : cors());

function apiOk(res, data, meta = {}) {
  res.json({
    status: 'success',
    data,
    meta: {
      source: 'db',
      generatedAt: new Date().toISOString(),
      ...meta,
    },
  });
}

function apiError(res, statusCode, code, message, details) {
  res.status(statusCode).json({
    status: 'failure',
    error: { code, message, details },
  });
}

function businessExists(businessId) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM businesses WHERE id = ?').get(businessId);
  return row.count > 0;
}

function mapBusiness(row) {
  return { id: row.id, name: row.name, timezone: row.timezone, isActive: row.is_active === 1 };
}

function mapService(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    durationMinutes: row.duration_minutes,
    priceCents: row.price_cents,
    currency: row.currency,
    isBookable: row.is_bookable === 1,
  };
}

function mapStaff(row, serviceIds) {
  return {
    id: row.id,
    businessId: row.business_id,
    displayName: row.display_name,
    serviceIds,
    isActive: row.is_active === 1,
  };
}

function mapSlot(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    staffId: row.staff_id,
    startIso: row.start_iso,
    endIso: row.end_iso,
    state: row.state,
    isBookable: row.is_bookable === 1,
  };
}

function mapBooking(row) {
  return {
    id: row.id,
    businessId: row.business_id,
    serviceId: row.service_id,
    staffId: row.staff_id,
    customerId: row.customer_id,
    slotId: row.slot_id,
    startIso: row.start_iso,
    endIso: row.end_iso,
    status: row.status,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

app.get('/api/businesses', (_req, res) => {
  const rows = db.prepare('SELECT id, name, timezone, is_active FROM businesses ORDER BY name').all();
  apiOk(res, rows.map(mapBusiness));
});

app.get('/api/services', (req, res) => {
  const { businessId } = req.query;
  if (!businessId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'businessId is required');
  }

  if (!businessExists(businessId)) {
    return apiError(res, 404, 'NOT_FOUND', 'Business not found');
  }

  const rows = db
    .prepare(
      `SELECT id, business_id, name, duration_minutes, price_cents, currency, is_bookable
       FROM services WHERE business_id = ? ORDER BY name`
    )
    .all(businessId);

  return apiOk(res, rows.map(mapService));
});

app.get('/api/staff', (req, res) => {
  const { businessId } = req.query;
  if (!businessId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'businessId is required');
  }

  if (!businessExists(businessId)) {
    return apiError(res, 404, 'NOT_FOUND', 'Business not found');
  }

  const rows = db
    .prepare(`SELECT id, business_id, display_name, is_active FROM staff WHERE business_id = ? ORDER BY display_name`)
    .all(businessId);

  const servicesByStaff = db
    .prepare('SELECT staff_id, service_id FROM staff_services WHERE staff_id IN (SELECT id FROM staff WHERE business_id = ?)')
    .all(businessId)
    .reduce((acc, row) => {
      if (!acc[row.staff_id]) {
        acc[row.staff_id] = [];
      }
      acc[row.staff_id].push(row.service_id);
      return acc;
    }, {});

  return apiOk(res, rows.map((row) => mapStaff(row, servicesByStaff[row.id] || [])));
});

app.get('/api/availability', (req, res) => {
  const { businessId, serviceId, staffId, dateIso } = req.query;
  if (!businessId || !serviceId || !staffId || !dateIso) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'businessId, serviceId, staffId, and dateIso are required');
  }

  const rows = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, start_iso, end_iso, state, is_bookable
       FROM availability_slots
       WHERE business_id = ? AND service_id = ? AND staff_id = ? AND start_iso LIKE ?
       ORDER BY start_iso`
    )
    .all(businessId, serviceId, staffId, `${dateIso}%`);

  return apiOk(res, rows.map(mapSlot));
});

app.get('/api/bookings', (req, res) => {
  const { customerId } = req.query;
  if (!customerId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'customerId is required');
  }

  const customerCount = db.prepare('SELECT COUNT(*) AS count FROM customers WHERE id = ?').get(customerId).count;
  if (customerCount === 0) {
    return apiError(res, 404, 'NOT_FOUND', 'Customer not found');
  }

  const rows = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings
       WHERE customer_id = ?
       ORDER BY start_iso`
    )
    .all(customerId);

  return apiOk(res, rows.map(mapBooking));
});

app.post('/api/bookings/intents', (req, res) => {
  const { businessId, serviceId, slotId, customerId } = req.body || {};
  if (!businessId || !serviceId || !slotId || !customerId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'businessId, serviceId, slotId, and customerId are required');
  }

  if (!businessExists(businessId)) {
    return apiError(res, 404, 'NOT_FOUND', 'Business not found');
  }

  const slot = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, start_iso, end_iso, state, is_bookable
       FROM availability_slots WHERE id = ?`
    )
    .get(slotId);

  if (!slot) {
    return apiError(res, 404, 'NOT_FOUND', 'Slot not found');
  }

  if (slot.business_id !== businessId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Slot does not belong to the specified business');
  }

  if (slot.service_id !== serviceId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Slot does not match the specified service');
  }

  if (!(slot.is_bookable === 1 && slot.state === 'open')) {
    return apiError(res, 409, 'CONFLICT', 'Slot is no longer bookable');
  }

  const conflicts = db
    .prepare(`SELECT id, slot_id, status FROM bookings WHERE slot_id = ? AND status IN ('pending', 'confirmed')`)
    .all(slotId)
    .map((row) => ({ id: row.id, slotId: row.slot_id, status: row.status }));

  const conflictCheck = detectDoubleBookingConflict(slotId, conflicts);
  if (!conflictCheck.valid) {
    return apiError(res, 409, 'CONFLICT', conflictCheck.violation.message, conflictCheck.violation);
  }

  const bookingId = `bk_${uuidv4()}`;
  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const createIntentTx = db.transaction(() => {
    db.prepare(
      `INSERT INTO bookings (id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
    ).run(bookingId, businessId, serviceId, slot.staff_id, customerId, slotId, slot.start_iso, slot.end_iso, nowIso);

    db.prepare(`UPDATE availability_slots SET state = 'held', is_bookable = 0 WHERE id = ?`).run(slotId);
  });

  createIntentTx();

  return apiOk(res, {
    intentId: `intent_${bookingId}`,
    bookingDraft: { businessId, serviceId, slotId, customerId },
    expiresAtIso,
  });
});

app.post('/api/bookings/:id/cancel', (req, res) => {
  const bookingId = req.params.id;
  const { customerId, reason } = req.body || {};

  if (!customerId || !reason) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'customerId and reason are required');
  }

  const row = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings WHERE id = ?`
    )
    .get(bookingId);

  if (!row) {
    return apiError(res, 404, 'NOT_FOUND', 'Booking not found');
  }

  if (row.customer_id !== customerId) {
    return apiError(res, 403, 'FORBIDDEN', 'Booking does not belong to this customer');
  }

  const transition = validateBookingTransition(row.status, 'cancelled');
  if (!transition.valid) {
    return apiError(res, 409, 'INVALID_TRANSITION', transition.violation.message, transition.violation);
  }

  const cancelTx = db.transaction(() => {
    db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(bookingId);

    const slot = db.prepare(`SELECT id, state FROM availability_slots WHERE id = ?`).get(row.slot_id);
    if (slot && slot.state === 'held') {
      db.prepare(`UPDATE availability_slots SET state = 'open', is_bookable = 1 WHERE id = ?`).run(row.slot_id);
    }
  });

  cancelTx();

  const updated = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings WHERE id = ?`
    )
    .get(bookingId);

  return apiOk(res, mapBooking(updated), { reason });
});

app.get('/api/provider/bookings-view', (req, res) => {
  const { businessId } = req.query;
  if (!businessId) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'businessId is required');
  }

  if (!businessExists(businessId)) {
    return apiError(res, 404, 'NOT_FOUND', 'Business not found');
  }

  const bookings = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings WHERE business_id = ? ORDER BY start_iso`
    )
    .all(businessId)
    .map(mapBooking);

  const bookingStatusOrder = ['pending', 'confirmed', 'cancelled'];
  const queueGroups = bookingStatusOrder.map((status) => ({
    status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
    bookings: bookings
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
  }));

  const calendarDaysMap = bookings.reduce((acc, booking) => {
    const dateIso = booking.startIso.split('T')[0];
    if (!acc[dateIso]) {
      acc[dateIso] = { dateIso, bookings: [] };
    }

    acc[dateIso].bookings.push({
      bookingId: booking.id,
      startIso: booking.startIso,
      endIso: booking.endIso,
      customerId: booking.customerId,
      serviceId: booking.serviceId,
      status: booking.status,
    });

    return acc;
  }, {});

  const calendarDays = Object.values(calendarDaysMap).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

  const slotSnapshots = db
    .prepare(
      `SELECT id, start_iso, end_iso, state, is_bookable
       FROM availability_slots WHERE business_id = ? ORDER BY start_iso`
    )
    .all(businessId)
    .map((slot) => ({
      slotId: slot.id,
      startIso: slot.start_iso,
      endIso: slot.end_iso,
      state: slot.state,
      isBookable: slot.is_bookable === 1,
    }));

  return apiOk(res, {
    businessId,
    generatedAtIso: new Date().toISOString(),
    queueGroups,
    calendarDays,
    slotSnapshots,
  });
});

app.post('/api/provider/bookings/:id/status', (req, res) => {
  const bookingId = req.params.id;
  const { nextStatus, actorId, reason } = req.body || {};

  if (!nextStatus || !actorId || !reason) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'nextStatus, actorId, and reason are required');
  }

  const bookingRow = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings WHERE id = ?`
    )
    .get(bookingId);

  if (!bookingRow) {
    return apiError(res, 404, 'NOT_FOUND', 'Booking not found');
  }

  const transition = validateBookingTransition(bookingRow.status, nextStatus);
  if (!transition.valid) {
    return apiError(res, 409, 'INVALID_TRANSITION', transition.violation.message, transition.violation);
  }

  const audit = {
    actionId: uuidv4(),
    actionType: 'booking_status_update',
    actorRole: 'provider',
    actorId,
    reason,
    atIso: new Date().toISOString(),
    entityId: bookingId,
    changedFields: ['status'],
  };

  db.transaction(() => {
    db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(nextStatus, bookingId);
    db.prepare(
      `INSERT INTO audit_events (id, action_type, actor_role, actor_id, reason, at_iso, entity_id, changed_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      audit.actionId,
      audit.actionType,
      audit.actorRole,
      audit.actorId,
      audit.reason,
      audit.atIso,
      audit.entityId,
      JSON.stringify(audit.changedFields)
    );
  })();

  const updatedBooking = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status
       FROM bookings WHERE id = ?`
    )
    .get(bookingId);

  return apiOk(res, {
    booking: mapBooking(updatedBooking),
    previousStatus: bookingRow.status,
    nextStatus,
    audit,
  });
});

app.post('/api/provider/availability/:id/state', (req, res) => {
  const slotId = req.params.id;
  const { nextState, actorId, reason } = req.body || {};

  if (!nextState || !actorId || !reason) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'nextState, actorId, and reason are required');
  }

  const slotRow = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, start_iso, end_iso, state, is_bookable
       FROM availability_slots WHERE id = ?`
    )
    .get(slotId);

  if (!slotRow) {
    return apiError(res, 404, 'NOT_FOUND', 'Slot not found');
  }

  const transition = validateSlotTransition(slotRow.state, nextState);
  if (!transition.valid) {
    return apiError(res, 409, 'INVALID_TRANSITION', transition.violation.message, transition.violation);
  }

  const audit = {
    actionId: uuidv4(),
    actionType: 'availability_slot_update',
    actorRole: 'provider',
    actorId,
    reason,
    atIso: new Date().toISOString(),
    entityId: slotId,
    changedFields: ['state', 'isBookable'],
  };

  db.transaction(() => {
    db.prepare('UPDATE availability_slots SET state = ?, is_bookable = ? WHERE id = ?').run(
      nextState,
      nextState === 'open' ? 1 : 0,
      slotId
    );
    db.prepare(
      `INSERT INTO audit_events (id, action_type, actor_role, actor_id, reason, at_iso, entity_id, changed_fields)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      audit.actionId,
      audit.actionType,
      audit.actorRole,
      audit.actorId,
      audit.reason,
      audit.atIso,
      audit.entityId,
      JSON.stringify(audit.changedFields)
    );
  })();

  const updatedSlot = db
    .prepare(
      `SELECT id, business_id, service_id, staff_id, start_iso, end_iso, state, is_bookable
       FROM availability_slots WHERE id = ?`
    )
    .get(slotId);

  return apiOk(res, {
    slot: mapSlot(updatedSlot),
    previousState: slotRow.state,
    nextState,
    audit,
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  apiError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
