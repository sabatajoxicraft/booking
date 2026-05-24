# Resilience Lane R1: Edge Case Enumeration

**Objective:** Enumerate golden-path-adjacent failure/edge cases with expected behavior and recovery paths for the canonical booking journey.

**Canonical Flow Reference:**
1. Service discovery
2. Slot selection
3. Customer details capture
4. Price/policy confirmation
5. Booking commit
6. Confirmation and post-booking status handling

---

## Edge Case Categories

### 1. **Network & Communication Failures**
Network timeouts, dropped connections, and partial request delivery during critical API operations.

### 2. **Timing & Race Conditions**
Concurrent operations on the same resource or time-dependent state transitions (e.g., slot expiration, booking intent TTL).

### 3. **State Consistency Issues**
Client-side state diverging from server state; stale data rendering after partial operations.

### 4. **Provider State Changes**
Upstream provider availability or booking status changes during customer's active booking flow.

### 5. **Data Validation & Invalid Transitions**
Malformed input, constraint violations, or illegal state transitions.

### 6. **Partial Completion Scenarios**
Operations that complete partially (e.g., intent created but confirmation fails) leaving customer in ambiguous state.

### 7. **Time-Based State Expiration**
Booking intent TTL expiration, availability slot no longer bookable, or booking cancellation windows closing.

### 8. **User Recovery & Retry Paths**
User actions to recover from failures (retry, restart, contact support).

---

## Prioritized Edge Case Scenarios

### **E1: Availability Slot Lost During Selection** *(Critical)*

**Category:** Network & Communication + Provider State Changes

**Description:**
After user selects a slot in Step 2 (Slot Selection), the slot becomes unavailable on the provider's system (e.g., another customer booked it concurrently or provider manually removed it). User proceeds to Step 3 (Customer Details) and attempts Step 5 (Booking Commit) with the now-invalid slot.

**Current Behavior:**
- No pre-flight validation between slot selection and booking commit.
- API returns error: `{code: 'SLOT_UNAVAILABLE', message: 'Slot is no longer available'}` at commit time.
- UI state shows "Selected Slot" but commit fails; no guidance on recovery.
- No automatic rebinding to alternative slots.

**Expected Behavior:**
- **Before commit:** Implement "slot liveness check" before Step 3 (Customer Details) entry—re-validate slot is still bookable.
- **On detect:** If slot invalid, show non-blocking warning: *"This slot was just booked. Please choose another."*
- **Recovery path:** Auto-populate availability query with same service/staff/date; highlight available alternatives.
- **User action:** User selects new slot or navigates backward to re-search.
- **UX tone:** "No problem—these other times just opened up."

**Severity:** Critical  
**Justification:** Core value disruption; customer must restart flow mid-journey.

**Recovery Paths:**
- Automatic: Re-query availability when entering Step 3 if user idle >30s in Step 2.
- Manual: "Check Availability Again" button with one-tap rebinding.
- Support escalation: If user attempts >3 times unsuccessfully.

---

### **E2: Booking Intent Expiration During Payment/Confirmation** *(Critical)*

**Category:** Time-Based Expiration + Partial Completion

**Description:**
Booking intent has a server-side TTL (e.g., 10 minutes). User completes Steps 1–4 within TTL, but Step 5 (Booking Commit) is called after intent expires. Backend rejects the commit with expired token.

**Current Behavior:**
- `BookingIntent` includes `expiresAtIso` field but no client-side countdown or UI timer.
- No warning when nearing expiration.
- Commit fails with: `{code: 'INTENT_EXPIRED', message: 'Booking intent has expired'}`.
- User sees error but no guidance; unclear if booking was partially created on server.

**Expected Behavior:**
- **Client-side countdown:** Display visible timer (e.g., "Complete booking in 5:32") from Step 3 onward.
- **Progressive warnings:** Yellow warning at 50% TTL, red alert at 25%.
- **On expiration:** Disable commit button; show: *"Your session has expired. Start a new booking to continue."* with one-tap restart.
- **Idempotent retry:** Implement request deduplication on server so accidental retries don't create duplicate bookings.
- **Confirmation check:** After expiration, offer customer option to check if booking was created (POST-commit to `/bookings/{customerId}` before restarting).

**Severity:** Critical  
**Justification:** Direct revenue loss and customer frustration; unclear if payment was processed.

**Recovery Paths:**
- Automatic: Extend TTL if user is actively interacting (keystroke, scroll, focus).
- Manual: "Extend Time" button to reset TTL from Step 3/4.
- Idempotent retry: If user retries commit within 2s of first attempt, server deduplicates.
- Support check: Customer can verify if booking was created before restarting.

---

### **E3: Network Timeout During Booking Commit** *(Critical)*

**Category:** Network & Communication + Partial Completion

**Description:**
User successfully enters all details and clicks "Confirm Booking" (Step 5). Network request hangs or times out (e.g., server is slow, network is flaky). Client doesn't know if the booking was created on the server or not.

**Current Behavior:**
- Request times out after 30s (default HTTP timeout).
- UI shows loading spinner indefinitely until timeout, then generic error: `{code: 'NETWORK_ERROR', message: 'Request timeout'}`.
- User doesn't know if booking was committed; may retry and accidentally create duplicate booking.
- No confirmation link or reference number.

**Expected Behavior:**
- **Timeout threshold:** Implement aggressive 10s timeout with clear messaging.
- **Confirmation poll:** On timeout, immediately poll `/bookings/{customerId}` (idempotent) to check if booking exists.
  - If found: show confirmation screen with booking ID.
  - If not found: offer retry with exponential backoff (1s, 2s, 4s).
- **User messaging:** "Just making sure your booking was created…" (calm, non-technical).
- **Reference generation:** Always return booking ID immediately after successful commit, even if downstream systems are slow.
- **Dead-letter queue:** Server-side logging of timeout commits for support reconciliation.

**Severity:** Critical  
**Justification:** Uncertain state; customer loses trust; potential duplicate bookings.

**Recovery Paths:**
- Automatic: Confirmation poll + idempotent retry mechanism.
- Manual: "Confirm Booking Status" button.
- Support escalation: If poll fails after 3 attempts; provide server-side transaction ID for support to investigate.

---

### **E4: Customer Details Validation Fails After Submission** *(High)*

**Category:** Data Validation & Invalid Transitions

**Description:**
User enters customer details (name, email, phone) in Step 3. Validation passes on client, but fails on server (e.g., regex mismatch, upstream business rules reject email domain, phone format conflicts with provider's provider). Commit fails at Step 5.

**Current Behavior:**
- Client-side validation is minimal (email format, required fields).
- Server returns validation error: `{code: 'INVALID_CUSTOMER_DATA', field: 'email', message: 'Invalid email format for provider'}`.
- UI shows error but doesn't guide user which field or how to fix.
- User must navigate back to Step 3 to edit; loses session context.

**Expected Behavior:**
- **Inline server validation feedback:** After Step 3 submit, perform async server validation (not at commit time). Show field-level feedback immediately.
- **Field-specific messaging:** Highlight invalid field with actionable guidance (e.g., "Use a business email for this provider" not "Invalid format").
- **Auto-focus remediation:** Focus cursor on first invalid field with suggested correction.
- **Resilient fallback:** If server validation fails at commit, auto-rewind to Step 3 with error context preserved.

**Severity:** High  
**Justification:** UX friction; customer confused why later step failed; data loss risk.

**Recovery Paths:**
- Automatic: Async validation after Step 3 submission; re-highlight fields on server validation fail.
- Manual: "Edit details" button to return to Step 3 with data preserved.
- Alternative: Allow customer to proceed with server-validated email, offer SMS OTP if email fails.

---

### **E5: Provider Marks Slot as Unavailable Between Selection and Commit** *(High)*

**Category:** Provider State Changes + Race Conditions

**Description:**
Customer selects a slot and completes Steps 3–4. Meanwhile, the provider manually marks the entire time window or staff member as unavailable in their admin panel. When customer attempts commit, backend detects slot conflict.

**Current Behavior:**
- No real-time sync between provider availability updates and customer UI.
- Commit fails: `{code: 'SLOT_UNAVAILABLE', message: 'Slot no longer available'}`.
- Customer sees error without context; doesn't know if they should retry or choose a different slot.

**Expected Behavior:**
- **Scheduled availability re-sync:** Refresh availability cache every 30s if customer idle in Steps 3–4.
- **Pre-commit validation:** Final check before commit that slot + staff are still available.
- **If conflict detected:** Show non-technical message: *"Sorry—the provider just blocked this time. Here are similar alternatives:"* with same-day/time adjacent slots.
- **One-tap rebooking:** Pre-populate availability query with original search params; highlight alternatives.
- **Notification on recovery:** "Your new time is confirmed!" if customer rebooking succeeds.

**Severity:** High  
**Justification:** Workflow disruption; customer friction; reflects on booking platform credibility.

**Recovery Paths:**
- Automatic: Periodic availability re-sync (30s) during Steps 3–4.
- Automatic: Pre-commit slot re-validation.
- Manual: "Find Another Time" button with same-day alternatives surfaced.
- Support escalation: If >2 consecutive slot conflicts; offer priority rebooking or refund.

---

### **E6: Customer Accidentally Closes Browser/Navigates Away Before Commit** *(High)*

**Category:** User Recovery + Partial Completion

**Description:**
Customer completes Steps 1–4 and is about to click "Confirm Booking" but accidentally closes the browser or navigates away. When they return, the session is lost; no recovery mechanism to resume.

**Current Behavior:**
- No session persistence (localStorage, server-side session).
- Customer loses all selections and must restart from Step 1.
- No email confirmation reminding customer they have an active booking intent.
- No "resumable" session link.

**Expected Behavior:**
- **Client-side persistence:** Save customer selections to localStorage (service, staff, slot, details) before Step 4.
- **Server-side intent tracking:** Booking intent is server-created and can be referenced.
- **Session recovery link:** After Step 4, send email with "Complete Your Booking" link that pre-populates selections (if within TTL).
- **Browser alert:** "Unsaved booking details" warning before unload (if in Steps 3–5).
- **Persistent session identifier:** Use customerId + device fingerprint to recover session on return within 24h.

**Severity:** High  
**Justification:** Revenue leakage; poor UX for legitimate browser crashes.

**Recovery Paths:**
- Automatic: localStorage persists selections; browser back-navigation may recover.
- Manual: Email recovery link (24h TTL) with one-tap resume.
- Alternative: SMS reminder: "Complete your booking to confirm." with deep link.

---

### **E7: Concurrent Booking Attempts from Same Customer** *(Medium)*

**Category:** Race Conditions + State Consistency

**Description:**
Customer clicks "Confirm Booking" button twice rapidly (double-click, network perceived as slow). Two simultaneous booking commit requests are sent to the server. Server processes both concurrently; both may succeed, creating duplicate bookings, or one fails with conflict error.

**Current Behavior:**
- No client-side double-click guard on commit button.
- Server doesn't deduplicate concurrent requests.
- Customer may see success response for first commit but error for second.
- Duplicate booking may exist on backend; business loses money (double charge).

**Expected Behavior:**
- **Button debounce:** Disable "Confirm Booking" button immediately after first click for 2s.
- **Visual feedback:** Button shows loading state; cannot be re-clicked.
- **Idempotent API design:** Server generates idempotency key (e.g., hash of intent + customerId + timestamp) to deduplicate concurrent commits within 60s window.
- **Response caching:** If idempotent key matches recent commit, return cached success response instead of duplicate.
- **Error clarity:** If second request arrives after first succeeded, return "BOOKING_ALREADY_CREATED" with booking ID instead of generic error.

**Severity:** Medium  
**Justification:** Financial risk; data integrity issue; less common but critical when occurs.

**Recovery Paths:**
- Automatic: Client-side button debounce + server-side idempotent request handling.
- Manual: If duplicate detected, support script can cancel the duplicate automatically.

---

### **E8: Service or Staff Member Becomes Unavailable Between Steps** *(Medium)*

**Category:** Provider State Changes

**Description:**
Customer selects a service (Step 1) and staff member (Step 2), then completes details (Step 3). Between Step 3 and commit, the provider removes that service or deactivates the staff member's account. Commit fails because service/staff no longer exist.

**Current Behavior:**
- No live verification that service/staff are still active during booking flow.
- Commit fails: `{code: 'INVALID_SERVICE', message: 'Service no longer available'}` or `{code: 'INVALID_STAFF', message: 'Staff member is unavailable'}`.
- User sees cryptic error; unclear what changed.

**Expected Behavior:**
- **Pre-flight checks:** Before commit, verify service and staff are still active/available.
- **If service removed:** Show: *"The provider discontinued this service. Here are similar alternatives:"* with alternatives from same business.
- **If staff deactivated:** Show: *"This staff member is no longer available. Other guides:"* with alternatives (if applicable).
- **Graceful rebinding:** Suggest most similar alternative (by service, price, duration) with one-tap re-select.
- **Notification:** Once rebooking succeeds, confirm: "Great! You're booked with {new_staff_member} for {service}."

**Severity:** Medium  
**Justification:** Edge case but high friction when occurs; reflects on booking platform quality.

**Recovery Paths:**
- Automatic: Pre-commit service/staff availability verification.
- Automatic: Suggest alternatives if removed.
- Manual: "Find Similar Service" or "Choose Another Guide" button.

---

### **E9: API Rate Limit or Server Overload During Peak Usage** *(Medium)*

**Category:** Network & Communication

**Description:**
During peak booking times (e.g., Black Friday, promotion launch), backend API hits rate limits or experiences resource exhaustion. Availability queries, booking commits, or confirmation polls receive 429 (Too Many Requests) or 503 (Service Unavailable) responses.

**Current Behavior:**
- No client-side rate-limit awareness or backoff strategy.
- Error returned as-is to user: `{code: 'SERVICE_UNAVAILABLE', message: 'Server is busy'}`.
- User may retry immediately, exacerbating server load.
- No queue or priority for high-intent users.

**Expected Behavior:**
- **Client-side backoff:** Implement exponential backoff (1s, 2s, 4s, 8s) on 429/503 with jitter.
- **User messaging:** "We're busy right now. Retrying in 3 seconds…" (reassuring, not alarming).
- **Rate-limit header parsing:** Read `Retry-After` header from server if present; respect provided wait time.
- **Priority queueing:** For committed bookings (Step 5), prioritize over availability queries; allow 3 retries within 60s window.
- **Fallback:** If persistent timeout (>3 retries over 2m), offer: *"Booking is taking longer than expected. We'll send you a confirmation link via email when ready."*

**Severity:** Medium  
**Justification:** Seasonal risk; impacts revenue during high-demand periods.

**Recovery Paths:**
- Automatic: Client-side exponential backoff with jitter.
- Automatic: Server-side rate-limit headers guide client backoff.
- Fallback: Email confirmation link for booking attempts during overload.

---

### **E10: Invalid Booking Status Returned After Confirmation** *(Low)*

**Category:** State Consistency + Data Validation

**Description:**
After successful booking commit (Step 5), backend returns booking object with unexpected or invalid status (e.g., `status: 'unknown'` or missing `id` field). UI cannot render confirmation screen properly.

**Current Behavior:**
- No schema validation of booking response.
- UI tries to render confirmation with malformed data; may show "undefined" or crash.
- Customer sees broken confirmation screen; unclear if booking succeeded.

**Expected Behavior:**
- **Response schema validation:** Validate `Booking` object schema before rendering confirmation (required fields: id, status, startIso, endIso).
- **Safe fallback:** If validation fails, show: *"Your booking is confirmed! Check your email for details."* with booking ID if available.
- **Error logging:** Capture schema violation for backend investigation (indicates API contract break).
- **Graceful degradation:** Display minimal confirmation (booking ID, date/time) even if response incomplete.

**Severity:** Low  
**Justification:** Rare (indicates backend bug); low impact if caught; good practice anyway.

**Recovery Paths:**
- Automatic: Schema validation + safe fallback rendering.
- Manual: Customer can navigate to "My Bookings" page to verify booking exists.
- Support escalation: Capture contract violation for backend team.

---

### **E11: Customer Cancels Booking, Then Rebooks Same Slot Immediately** *(Low)*

**Category:** State Consistency + Race Conditions

**Description:**
Customer cancels their booking (which is supported in Step 6). Immediately after cancellation response, customer attempts to rebook the same slot (which is now available). Server may have stale state where slot is still marked as "booked by this customer" momentarily.

**Current Behavior:**
- Cancellation deletes booking record; availability slot is freed.
- If rebooking request races ahead of cancellation cache invalidation, slot may be rejected as "already booked".
- Customer sees error on what should be available slot.

**Expected Behavior:**
- **Cancellation idempotency:** Implement same cancellation token to prevent double-cancellations.
- **Cache invalidation:** Immediately invalidate slot availability cache on cancellation.
- **Graceful handling:** If rebooking fails due to stale state, auto-retry availability query and present fresh alternatives.
- **User messaging:** Confirm cancellation clearly; offer: *"You can rebook this time here, or see other options."* with slot immediately marked available.

**Severity:** Low  
**Justification:** Unlikely scenario; affects power users; easy recovery.

**Recovery Paths:**
- Automatic: Cache invalidation on cancellation.
- Automatic: Retry availability query if rebooking immediately fails.
- Manual: "Find Similar Time" button if original slot still appears unavailable.

---

### **E12: Timezone Mismatch Between Client and Server** *(Low)*

**Category:** Data Consistency

**Description:**
Customer's local timezone differs from provider/business timezone. Time display shows correct absolute times, but calendar day boundaries or business hours may be misinterpreted. For example, a 9 AM slot for a provider in UTC+8 may display as 1 AM for a customer in UTC-5, creating confusion.

**Current Behavior:**
- All times stored and returned as ISO strings (e.g., `2025-03-15T09:00:00Z`).
- Client renders times in local timezone but doesn't display provider's timezone context.
- Availability query doesn't account for cross-timezone day boundaries.
- User may accidentally select a slot that's outside business hours from provider's perspective.

**Expected Behavior:**
- **Timezone context:** Display provider's timezone explicitly: *"9:00 AM (Provider's time: 5:00 PM)"*.
- **Business hours validation:** Validate availability query respects provider's local business hours, not customer's.
- **Day boundary clarity:** Show booking date in both customer and provider timezone (if different).
- **Confirmation:** Confirm booking shows time in both timezones: *"Confirmed: March 15, 9:00 AM your time (5:00 PM provider's time)"*.
- **Preventive UI:** Availability calendar respects provider's business hours in provider's timezone.

**Severity:** Low  
**Justification:** Rare edge case (most bookings within similar timezones); good UX practice anyway.

**Recovery Paths:**
- Automatic: Always display provider timezone in UI; validate availability respects provider TZ.
- Manual: Confirmation screen shows dual-timezone times; customer can verify before confirming.

---

## Summary Table

| ID | Category | Severity | Impact | Recovery Strategy |
|---|---|---|---|---|
| E1 | Network + Provider | **Critical** | Booking disrupted; customer confused | Auto re-validate; suggest alternatives |
| E2 | Timing + Partial | **Critical** | Revenue loss; unclear if booking created | TTL countdown; idempotent retry; confirm poll |
| E3 | Network + Partial | **Critical** | Uncertain state; duplicate risk | Confirm poll; idempotent retry; reference ID |
| E4 | Validation | **High** | UX friction; data loss risk | Async validation; field feedback; preserve context |
| E5 | Provider + Race | **High** | Workflow disruption; trust damage | Re-sync; pre-commit validation; alternatives |
| E6 | Recovery + Partial | **High** | Revenue leakage; poor UX | localStorage; email recovery; session ID |
| E7 | Race + Consistency | **Medium** | Duplicate bookings; financial risk | Debounce; idempotent API; dedup logic |
| E8 | Provider State | **Medium** | Friction; quality reflection | Pre-flight checks; graceful rebinding |
| E9 | Network (Overload) | **Medium** | Peak-time revenue loss | Exponential backoff; priority queue; email fallback |
| E10 | Consistency | **Low** | Rare; poor UX if occurs | Schema validation; safe fallback |
| E11 | State + Race | **Low** | Unlikely; power-user friction | Cache invalidation; retry logic |
| E12 | Consistency | **Low** | Rare; UX confusion | TZ context display; dual-timezone confirm |

---

## Cross-Cutting Design Principles

1. **Idempotency First:** All mutations (booking commit, cancellation, status updates) must support deduplication via idempotency key to safely retry on network failure.

2. **Confirmation Polling:** After uncertain states (timeout, crash), implement immediate status-check queries to verify server state before restarting user flow.

3. **Progressive Warnings:** Display time-critical state (TTL countdown, availability freshness) to customers proactively; don't hide until failure.

4. **Graceful Degradation:** If perfect data unavailable (validation fails, schema breaks), show safe fallback with whatever context exists (ID, date, confirmation status).

5. **One-Tap Recovery:** Every error should offer a direct recovery action button or automatic retry; avoid dead-end error states.

6. **Calm Messaging:** Errors phrased as collaborative problems ("We're double-checking…", "Let's find another time…") not system failures ("ERROR 503").

7. **Session Persistence:** Store customer's journey in localStorage (Steps 1–4 selections) to enable recovery from browser close without full restart.

8. **Server-Side Audit Trails:** Log all edge-case scenarios (retries, timeouts, schema violations, rate limits) for post-incident analysis and monitoring.

---

## Next Steps (R2 Implementation)

Edge cases E1–E12 are prioritized for R2 implementation. Implementation will follow:

1. **Server-side infrastructure** (idempotent API, request deduplication, enhanced logging).
2. **Client-side state management** (localStorage persistence, confirmation polling, session recovery).
3. **UI/UX enhancements** (TTL countdown, field-level validation, alternative suggestions, calm messaging).
4. **Test matrix** (E1–E12 coverage in R3 validation phase).

All changes will be gated by **Flow Integrity**, **KISS**, and **DRY** design reviews before merge.
