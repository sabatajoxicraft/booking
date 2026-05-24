const { getDb } = require('./database');

function seedDb() {
  const db = getDb();
  let seededRows = 0;

  const run = (sql, values) => {
    const result = db.prepare(sql).run(values);
    seededRows += result.changes;
  };

  const tx = db.transaction(() => {
    run(
      `INSERT OR REPLACE INTO businesses (id, name, timezone, is_active)
       VALUES (@id, @name, @timezone, @is_active)`,
      { id: 'biz_main', name: 'Aurora Wellness Studio', timezone: 'Africa/Johannesburg', is_active: 1 }
    );

    const services = [
      {
        id: 'svc_consult',
        business_id: 'biz_main',
        name: 'Initial Consultation',
        duration_minutes: 45,
        price_cents: 65000,
        currency: 'ZAR',
        is_bookable: 1,
      },
      {
        id: 'svc_massage',
        business_id: 'biz_main',
        name: 'Deep Tissue Massage',
        duration_minutes: 60,
        price_cents: 85000,
        currency: 'ZAR',
        is_bookable: 1,
      },
    ];

    const upsertService = db.prepare(
      `INSERT OR REPLACE INTO services (id, business_id, name, duration_minutes, price_cents, currency, is_bookable)
       VALUES (@id, @business_id, @name, @duration_minutes, @price_cents, @currency, @is_bookable)`
    );
    services.forEach((row) => {
      seededRows += upsertService.run(row).changes;
    });

    const staff = [
      { id: 'stf_amy', business_id: 'biz_main', display_name: 'Amy Daniels', is_active: 1 },
      { id: 'stf_ben', business_id: 'biz_main', display_name: 'Ben Carter', is_active: 1 },
    ];
    const upsertStaff = db.prepare(
      `INSERT OR REPLACE INTO staff (id, business_id, display_name, is_active)
       VALUES (@id, @business_id, @display_name, @is_active)`
    );
    staff.forEach((row) => {
      seededRows += upsertStaff.run(row).changes;
    });

    const staffServices = [
      { staff_id: 'stf_amy', service_id: 'svc_consult' },
      { staff_id: 'stf_amy', service_id: 'svc_massage' },
      { staff_id: 'stf_ben', service_id: 'svc_massage' },
    ];
    const upsertStaffService = db.prepare(
      `INSERT OR REPLACE INTO staff_services (staff_id, service_id)
       VALUES (@staff_id, @service_id)`
    );
    staffServices.forEach((row) => {
      seededRows += upsertStaffService.run(row).changes;
    });

    const customers = [
      { id: 'cus_demo', full_name: 'Jane Demo', email: 'jane@demo.com', phone_e164: '+27821234567' },
      { id: 'cus_bob', full_name: 'Bob Smith', email: 'bob@example.com', phone_e164: null },
    ];
    const upsertCustomer = db.prepare(
      `INSERT OR REPLACE INTO customers (id, full_name, email, phone_e164)
       VALUES (@id, @full_name, @email, @phone_e164)`
    );
    customers.forEach((row) => {
      seededRows += upsertCustomer.run(row).changes;
    });

    const slots = [
      {
        id: 'slot_001',
        business_id: 'biz_main',
        service_id: 'svc_consult',
        staff_id: 'stf_amy',
        start_iso: '2026-01-20T09:00:00.000Z',
        end_iso: '2026-01-20T09:45:00.000Z',
        state: 'open',
        is_bookable: 1,
      },
      {
        id: 'slot_002',
        business_id: 'biz_main',
        service_id: 'svc_consult',
        staff_id: 'stf_amy',
        start_iso: '2026-01-20T10:00:00.000Z',
        end_iso: '2026-01-20T10:45:00.000Z',
        state: 'held',
        is_bookable: 0,
      },
      {
        id: 'slot_003',
        business_id: 'biz_main',
        service_id: 'svc_consult',
        staff_id: 'stf_amy',
        start_iso: '2026-01-20T11:00:00.000Z',
        end_iso: '2026-01-20T11:45:00.000Z',
        state: 'open',
        is_bookable: 1,
      },
      {
        id: 'slot_004',
        business_id: 'biz_main',
        service_id: 'svc_massage',
        staff_id: 'stf_amy',
        start_iso: '2026-01-20T14:00:00.000Z',
        end_iso: '2026-01-20T15:00:00.000Z',
        state: 'open',
        is_bookable: 1,
      },
      {
        id: 'slot_005',
        business_id: 'biz_main',
        service_id: 'svc_massage',
        staff_id: 'stf_ben',
        start_iso: '2026-01-20T09:00:00.000Z',
        end_iso: '2026-01-20T10:00:00.000Z',
        state: 'open',
        is_bookable: 1,
      },
      {
        id: 'slot_006',
        business_id: 'biz_main',
        service_id: 'svc_massage',
        staff_id: 'stf_ben',
        start_iso: '2026-01-20T10:30:00.000Z',
        end_iso: '2026-01-20T11:30:00.000Z',
        state: 'blocked',
        is_bookable: 0,
      },
    ];
    const upsertSlot = db.prepare(
      `INSERT OR REPLACE INTO availability_slots (id, business_id, service_id, staff_id, start_iso, end_iso, state, is_bookable)
       VALUES (@id, @business_id, @service_id, @staff_id, @start_iso, @end_iso, @state, @is_bookable)`
    );
    slots.forEach((row) => {
      seededRows += upsertSlot.run(row).changes;
    });

    const nowIso = new Date().toISOString();
    const bookings = [
      {
        id: 'bk_001',
        business_id: 'biz_main',
        service_id: 'svc_consult',
        staff_id: 'stf_amy',
        customer_id: 'cus_demo',
        slot_id: 'slot_001',
        start_iso: '2026-01-20T09:00:00.000Z',
        end_iso: '2026-01-20T09:45:00.000Z',
        status: 'confirmed',
        created_at: nowIso,
      },
      {
        id: 'bk_002',
        business_id: 'biz_main',
        service_id: 'svc_consult',
        staff_id: 'stf_amy',
        customer_id: 'cus_demo',
        slot_id: 'slot_002',
        start_iso: '2026-01-20T10:00:00.000Z',
        end_iso: '2026-01-20T10:45:00.000Z',
        status: 'pending',
        created_at: nowIso,
      },
    ];
    const upsertBooking = db.prepare(
      `INSERT OR REPLACE INTO bookings (id, business_id, service_id, staff_id, customer_id, slot_id, start_iso, end_iso, status, created_at)
       VALUES (@id, @business_id, @service_id, @staff_id, @customer_id, @slot_id, @start_iso, @end_iso, @status, @created_at)`
    );
    bookings.forEach((row) => {
      seededRows += upsertBooking.run(row).changes;
    });
  });

  tx();
  console.log(`Database seeded successfully. Rows seeded: ${seededRows}`);
}

if (require.main === module) {
  seedDb();
}

module.exports = { seedDb };
