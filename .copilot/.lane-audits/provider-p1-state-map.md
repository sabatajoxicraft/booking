# Provider Ops Canonical State Map (M1-P1)

## 1. PRD Provider Responsibility Scope

### What Does Provider See?
From the PRD canonical booking flow (discovery → slot selection → details → price/policy → commit → confirmation), the provider's purview encompasses:

| Flow Stage | Provider Visibility | Provider Control |
|---|---|---|
| Service discovery | Service catalog (name, duration, price) | ✓ Define service metadata (durationMinutes, priceCents, isBookable flag) |
| Slot selection | Available slots (availability snapshots) | ✓ Create, hold, block availability slots |
| Customer details capture | Customer name, contact (via service) | ✗ Does not edit customer data |
| Price/policy confirmation | Price display at confirmation | ✓ Approve/set policy boundaries (pricing immutable once booking confirmed) |
| Booking commit | Booking created in 'pending' state | ✗ Cannot force confirm; customer controls final commit |
| Confirmation & post-booking | Queue and calendar views of all bookings | ✓ Change booking status (pending → confirmed → cancelled), manage outcomes |

### Core Provider Responsibilities
1. **Service Definition** — Define service metadata and policy (duration, price, bookability).
2. **Availability Management** — Create and manage availability slots (open, held, blocked states).
3. **Booking Acknowledgment** — Confirm or decline pending bookings.
4. **Outcome Reporting** — Mark completed/cancelled bookings and manage cancellations.

---

## 2. Current Provider State Model

### Booking Status Model
**Canonical states:** `pending` | `confirmed` | `cancelled`

| Status | Initiated By | Meaning | Provider Action? | Terminal? |
|---|---|---|---|---|
| pending | Customer creates booking intent | Awaiting provider acknowledgment | YES (confirm/decline) | NO |
| confirmed | Provider confirms pending booking | Booking locked; service scheduled | NO direct status change | NO |
| cancelled | Either party via CancelBooking or provider via status update | Booking voided; slot released | YES (provider can initiate) | YES |

### Availability Slot State Model
**Canonical states:** `open` | `held` | `blocked`

| State | Initiated By | Meaning | isBookable Flag |
|---|---|---|---|
| open | Provider during slot creation | Slot available for customer booking | true |
| held | System during booking creation (implied) | Slot reserved for a specific booking | false |
| blocked | Provider action | Slot unavailable (maintenance, staff absence) | false |

**CRITICAL GAP:** `held` state is not explicitly managed in current code. When a booking transitions to `pending`, the corresponding slot state should transition to `held`, but this is not explicitly documented.

### Current Provider View (ProviderBookingsView)
```
- queueGroups: Bookings grouped by status (pending, confirmed, cancelled)
- calendarDays: Bookings grouped by date
- slotSnapshots: Current slot states (open, held, blocked)
```

**What's Missing:** No explicit policy/reason field for why a slot is blocked or booking is cancelled. Audit trail exists but reasoning is minimal.

---

## 3. State Alignment Gaps vs. PRD Flow

### Gap 1: Booking Status → Availability Slot State Coupling Undefined
**Issue:** When a booking status changes, the related availability slot's state must change symmetrically, but this coupling is not explicitly documented.

**Expected Behavior (PRD Flow):**
- Customer creates booking intent → Slot transitions from `open` → `held`
- Provider confirms booking → Slot remains `held` (booking owns the slot)
- Provider cancels booking → Slot transitions from `held` → `open` (slot released back to availability)
- Provider blocks slot → Slot transitions to `blocked` (any pending booking must be cancelled first)

**Current Gap:** No explicit synchronization rule between booking status changes and slot state updates.

### Gap 2: Policy Handoff Boundary Unclear
**Issue:** PRD says "price/policy confirmation before commitment," but current model doesn't capture:
- When is policy immutable?
- Can provider change policy mid-booking?
- How are policy conflicts detected?

**Expected Clarity:** Once a booking is created (customer commits to intent), pricing and service terms are locked. Provider cannot unilaterally change pricing on an existing booking.

### Gap 3: Cancellation Reason and Compensation Not Captured
**Issue:** CancelBookingInput and ProviderBookingStatusUpdateInput accept a `reason` field, but there's no structured taxonomy for reasons (e.g., "customer_requested" vs. "provider_cancelled" vs. "staff_unavailable").

**Expected Behavior:** Cancellation reason should distinguish between:
- Customer-initiated cancellation (customer responsibility)
- Provider-initiated cancellation (may trigger compensation/rebooking)
- System-initiated cancellation (timeout, conflict resolution)

### Gap 4: Slot Availability Synchronization with Booking Lifecycle
**Issue:** When provider updates a slot to `blocked`, any `pending` bookings in that slot are orphaned (no automatic cascade cancel).

**Expected Behavior:** Blocking a slot should:
1. Identify all pending/confirmed bookings in that slot
2. Either cascade-cancel them with appropriate reason
3. Or reject the block request if confirmed bookings exist

---

## 4. Explicit State Transition Rules

### Booking Status Transition Matrix (Canonical Rules)

| Current State | Target State | Allowed? | Actor | Trigger | Slot Impact |
|---|---|---|---|---|---|
| N/A | pending | YES | Customer | Create booking intent | Release slot from open → held |
| pending | confirmed | YES | Provider | Confirm booking | Slot stays held (confirmed owns slot) |
| pending | cancelled | YES | Provider or Customer | Decline/cancel | Release slot from held → open |
| confirmed | cancelled | YES | Provider or Customer | Cancellation request | Release slot from held → open |
| cancelled | pending | NO | — | — | — |
| confirmed | pending | NO | — | — | — |
| cancelled | * | NO | — | Terminal state | — |

### Availability Slot State Transition Matrix (Canonical Rules)

| Current State | Target State | Allowed? | Actor | Trigger | Booking Impact |
|---|---|---|---|---|---|
| N/A | open | YES | Provider | Create slot | No bookings yet |
| open | held | YES | System | Customer creates booking in this slot | New pending booking attached |
| held | open | YES | System | Booking cancelled/expires | Slot released back to market |
| open | blocked | YES | Provider | Manual block (maintenance/absence) | No new bookings; existing bookings unaffected |
| held | blocked | NO | — | Cannot block slot with confirmed booking | Reject operation or cascade-cancel first |
| blocked | open | YES | Provider | Maintenance/absence ends | Slot re-opened to market |
| blocked | held | NO | — | Cannot directly transition | Must go through open first |

### Explicit Non-Allowed Transitions (KISS)
- Booking cannot go from `cancelled` → any other state (terminal)
- Slot cannot go from `held` → `blocked` directly (must open first or cancel booking)
- Slot cannot go from `blocked` → any state except `open` (prevents confusion)

---

## 5. Handoff Points Between Customer and Provider Flows

### Handoff 1: Booking Intent Creation → Provider Queue
**Customer Initiates:**
- Selects service, slot, provides details
- Creates booking intent (expires after X minutes)
- Booking enters `pending` state
- Slot transitions from `open` → `held`

**Provider Receives:**
- Booking appears in "Pending" queue group
- Provider sees customer name, service, time, slot details
- **Provider Decision Point:** Confirm or decline within SLA (undefined in current code)

**Transition Rule:** 
- Provider confirms → Booking: `pending` → `confirmed`, Slot: `held` (stays held)
- Provider declines → Booking: `pending` → `cancelled`, Slot: `held` → `open`

---

### Handoff 2: Provider Confirms → Booking Locked
**Provider Confirms:**
- Booking moves from `pending` → `confirmed`
- Slot state remains `held` (owned by confirmed booking)
- Provider can now see booking in "Confirmed" queue group

**Customer Impact:**
- Receives confirmation notification (not modeled in current types; assumed external)
- Can view confirmed booking details
- Cannot change service/time (locked by provider)

**Both Can Cancel:**
- Either party can initiate cancellation
- Slot released from `held` → `open` (if no rebooking)

---

### Handoff 3: Provider Slot Management → Availability for Customers
**Provider Blocks Slot:**
- Provider marks slot `open` → `blocked` (e.g., staff absence)
- Slot disappears from customer availability list
- **Precondition:** No `confirmed` bookings should exist in blocked slot
- **ISSUE:** If confirmed booking exists, operation should fail or cascade-cancel

**Provider Unblocks Slot:**
- Slot transitions `blocked` → `open`
- Slot re-appears in customer availability immediately (next query)

**Synchronization Risk:** Stale availability if provider blocks but customer already has pending booking in that slot.

---

### Handoff 4: Cancellation Flow
**Either Party Initiates Cancellation:**

| Actor | Method | Booking State Change | Slot Impact | Reason Captured? |
|---|---|---|---|---|
| Customer | CancelBooking API | `pending` or `confirmed` → `cancelled` | `held` → `open` | YES (reason field) |
| Provider | updateBookingStatus to `cancelled` | `pending` or `confirmed` → `cancelled` | `held` → `open` | YES (reason field) |

**Missing:** Reason taxonomy (customer_requested, provider_issue, timeout, etc.)

---

## 6. Recommended Canonical State Model for P2 Implementation

### Refined Booking Status Enum (No change, but clarify semantics)
```
pending   → "Awaiting provider confirmation" (customer action completed)
confirmed → "Locked; service scheduled" (provider acknowledged; customer can still cancel)
cancelled → "Voided; no service delivery" (terminal)
```

### Refined Slot State Enum (No change, but clarify semantics)
```
open     → "Available for new bookings"
held     → "Reserved by specific pending/confirmed booking"
blocked  → "Unavailable (provider action: maintenance/absence/override)"
```

### New Coupling Rules (Must be enforced in P2)
**Invariant 1:** A `pending` booking MUST have its slot in `held` state.
**Invariant 2:** A `confirmed` booking MUST have its slot in `held` state.
**Invariant 3:** A slot can be in `held` state ONLY if an active (`pending` or `confirmed`) booking exists.
**Invariant 4:** Blocking a slot with `held` state MUST first cascade-cancel or reject.

### New Cancellation Reason Taxonomy (Recommended)
```
Reason Enum:
  | customer_requested      → Customer via CancelBooking API
  | customer_no_show        → Customer did not appear (post-service)
  | provider_accepted       → Provider accepted/confirmed (not cancellation; status update)
  | provider_cancelled      → Provider declined or cancelled after acceptance
  | provider_no_capacity    → Provider out of capacity/staff
  | booking_expired         → Booking intent expired (timeout)
  | conflict_resolution     → Slot conflict or policy violation
  | system_error            → System-triggered cancellation
```

---

## 7. Validation Checklist for P2 Readiness

- [ ] Booking status ↔ slot state coupling is explicitly enforced via API (no orphaned states)
- [ ] Slot blocking rejects or cascades cancellations (prevents held→blocked violation)
- [ ] Cancellation reasons use structured enum (not free-text)
- [ ] Provider confirmation SLA is defined (how long before auto-cancel pending?)
- [ ] Audit trail captures reason for every status/state change
- [ ] API validation rejects invalid transitions (e.g., confirmed → pending)
- [ ] Customer and provider flows do not allow simultaneous state changes (optimistic lock or event-sourced)
- [ ] Stale availability is impossible (slot state reflects actual bookings, not cache)

---

## 8. Summary for P2 Execution

**P2 Must Implement:**
1. **Booking ↔ Slot State Synchronization:** Automatic slot state changes when booking status changes.
2. **Slot Blocking Safeguards:** Reject or cascade-cancel when blocking a slot with active bookings.
3. **Cancellation Taxonomy:** Use enum-based reason field instead of free-text.
4. **SLA Enforcement:** Define and enforce provider confirmation timeout.
5. **Atomic Operations:** Status updates must be transactional (no partial state).
6. **Validation Rules:** Enforce state transition matrix at API boundary.

**Current Code Artifacts P2 Should Reference:**
- `src/types/booking.ts` — BookingStatus enum
- `src/types/availability-slot.ts` — AvailabilitySlotState enum
- `src/types/provider-ops.ts` — ProviderBookingStatusUpdateInput, ProviderAvailabilitySlotStateUpdateInput
- `src/pages/provider-ops-page.tsx` — Current provider UX (UI state management)
- `src/services/interfaces.ts` — ProviderOperationsService interface

---

## Unambiguity Assessment (P2 Ready?)

**State Transitions:** ✅ Unambiguous (matrix defined above)  
**Handoff Points:** ✅ Unambiguous (5 explicit handoffs defined; roles clear)  
**Coupling Rules:** ✅ Unambiguous (4 invariants stated; enforcement method clear)  
**Cancellation:** ⚠️ **Partially Ambiguous** (need reason enum; SLA undefined)  
**Slot Blocking Conflict:** ⚠️ **Ambiguous** (behavior on held→blocked not specified; recommend cascade-cancel)

**P2 Readiness:** **READY WITH CONDITIONS**
- P2 can execute if it commits to the cancellation reason enum and slot-blocking conflict resolution strategy above.
- Suggest P2 resolves the two ⚠️ ambiguities in opening meeting before implementation.
