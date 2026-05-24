# Brand Audit B1: Booking UI Copy & Components vs PRD Standard

**Status:** Draft for B2 implementation  
**Audit Date:** 2025-05-24  
**Scope:** All customer-facing UI copy and component labels across booking flow  

---

## 1. PRD Brand Promise & Tone Requirements

From `.copilot/prd.md`:

| Pillar | Definition |
|--------|-----------|
| **Clear** | Language is direct, jargon-free, unambiguous at each booking step |
| **Trustworthy** | Transparent pricing/policy presentation before commitment; explicit state transitions |
| **Calm** | Tone is reassuring, reduces anxiety; avoids urgency language or aggressive CTAs |
| **Visual Hierarchy** | Atomic Design components consistently signal primary/secondary actions |

**Key Rules:**
- Every state exposes next valid action (no dead ends).
- No hidden transitions between states.
- Terminal states are explicit and immutable.
- Pricing & policy visible **before** checkout (transparency gate).

---

## 2. Current Copy & Component Audit Findings

### 2.1 Critical Issues (Blocks Flow Integrity)

#### Issue A: "Aurora" Terminology Inconsistency  
**Location:** `customer-journey-page.tsx` (lines 98, 104, 196, 240, 480, 505, 517, 549, 585, 692)

| Copy | Problem | Brand Impact |
|------|---------|-------------|
| `"Choose an Aurora service and guide first"` | **Aurora** is internal codename, not customer-facing brand term | Confusing; breaks clarity |
| `"Choose a service and Aurora guide in Discover before selecting a time"` | Mixed terminology ("Aurora guide" + "Discover") | Unclear; not calm |
| `"Loading Aurora catalog options..."` | Unexplained domain term | Jargon; reduces trust |
| `"Aurora location"` | Should be "Business" or "Provider" | Unclear reference |
| `"Sending Aurora journey updates..."` | Process detail not user concern | Verbose; not calm |

**Severity:** 🔴 **HIGH** — Breaks clarity pillar. Customers don't know what "Aurora" is.

---

#### Issue B: Incomplete Disclosure of Pricing Before Checkout  
**Location:** `customer-journey-page.tsx` (lines 630–636, 644)

| Section | Current State | Issue |
|---------|---------------|-------|
| Confirm details | Displays service name + duration + price | ✅ Price shown |
| **Checkout** | Button states: `Pay now` (hold fallback) | ❌ **No policy disclosure** |
| | No terms, no cancellation policy, no payment disclaimer | ❌ **Missing transparency** |

**Severity:** 🔴 **HIGH** — Violates PRD transparency gate. Pricing yes, but policies hidden.

---

#### Issue C: Unclear Next-Action Guidance (Dead-End Risk)  
**Location:** `customer-journey-page.tsx` (lines 243, 246, 365, 619)

| Message | Problem |
|---------|---------|
| `"Pick service, guide, and time to continue to checkout."` | Imperative but no visual affordance; user doesn't know **how** |
| `"Next action: select a slot, then confirm your details."` | Assumes user knows workflow; no progress indicator |
| `"Confirm your service and time before checkout."` | Doesn't say **what to do next** after confirming |

**Severity:** 🟠 **MEDIUM-HIGH** — Flow integrity issue. Users may get stuck.

---

### 2.2 Tone & Clarity Issues (Brand Misalignment)

#### Issue D: Button Copy Not Calm or Clear  
**Location:** `bookings-page.tsx` (lines 139, 200, 247), `availability-page.tsx` (line 112)

| Button | Issue | Tone Misalignment |
|--------|-------|------------------|
| `"Simulate deterministic slot conflict"` | Internal QA language exposed to user | Not calm; confusing |
| `"Create intent"` | Technical jargon | Unclear what "intent" means |
| `"Select slot"` vs. `"Selected"` | State toggle unclear | Not explicit about action |

**Severity:** 🟠 **MEDIUM** — Confuses users; violates clarity.

---

#### Issue E: Error Messages Expose Implementation Details  
**Location:** `catalog-page.tsx` (line 82), `bookings-page.tsx` (line 154, 179, 215)

| Error | Problem |
|-------|---------|
| `"Catalog error ({state.error.code}): {state.error.message}"` | Shows `VALIDATION_ERROR`, `CONFLICT` etc.; not customer-friendly |
| `"Booking list error"` / `"Intent error"` | Vague; doesn't guide recovery |

**Severity:** 🟠 **MEDIUM** — Breaks trust (technical jargon in errors).

---

#### Issue F: Inconsistent Status Labels  
**Location:** `bookings-page.tsx` (lines 30–34), `provider-ops-page.tsx` (lines 27–31)

| Status | Current Label | Issue |
|--------|---------------|-------|
| confirmed | `"Confirmed"` | ✅ Clear |
| pending | `"Pending"` | ⚠️ Vague; user doesn't know what they're waiting for |
| cancelled | `"Cancelled"` | ✅ Clear |

**Severity:** 🟡 **LOW-MEDIUM** — Clarity gap; not calm (ambiguity breeds anxiety).

---

#### Issue G: Loading States Are Verbose  
**Location:** Multiple pages (lines 78, 85, 150, 174, 271–333)

| Message | Issue |
|---------|-------|
| `"Loading businesses, services, and staff..."` | Granular; user doesn't care about internals |
| `"Loading deterministic availability slots..."` | "Deterministic" is internal; scary to customer |
| `"Loading provider queue and calendar baseline..."` | Jargon overload; not calm |

**Severity:** 🟡 **LOW-MEDIUM** — Not calm; exposes implementation.

---

#### Issue H: Missing Disclosure Labels for Simulations  
**Location:** `bookings-page.tsx` (lines 133–140, 166–173), `provider-ops-page.tsx` (lines 164–171)

| Section | Issue |
|---------|-------|
| "Simulate missing customer list error" | Checkbox visible in live UI; confuses customers |
| "Simulate deterministic slot conflict" | Same; QA tool exposed to customers |

**Severity:** 🟡 **LOW** — UX pollution; test harness should be hidden in prod.

---

### 2.3 Component Audit

#### Status Chip  
**File:** `status-chip.tsx`  
**Issue:** No visual context for pending state. Muted color = unclear urgency.  
**Calm Score:** 2/5 (neutral, not reassuring).

#### Section Heading  
**File:** `section-heading.tsx`  
**Issue:** Subtitle font too small (xs); hard to read secondary messaging.  
**Clarity Score:** 2/5 (readability problem).

#### Button  
**File:** `button.tsx`  
**Issue:** No visual distinction for "next action" (missing primary affordance).  
**Trust Score:** 2/5 (user unsure what to do).

---

## 3. File-by-File Fix List

### **P0 (Blocking): Transparency Gate + Flow Integrity**

#### `src/pages/customer-journey-page.tsx`

- **L98–104:** Replace `"Aurora"` with `"Select a service and staff member to see available times."`
- **L196:** Replace `"Choose a service and Aurora guide in Discover"` → `"Choose a service and staff member in the catalog"`
- **L240:** Replace `"Finish Discover first to confirm your Aurora booking details."` → `"Choose a service and staff member to continue."`
- **L243:** Replace `"Select an available time before confirming details."` → `"Pick a time slot to proceed to review."`
- **L246:** Replace `"Pick service, guide, and time to continue to checkout."` → `"Your selection is incomplete. Choose a service, staff member, and time."`
- **L249:** Replace `"Details confirmed. Continue to checkout with Pay now (hold is fallback)."` → `"Your booking details are confirmed. Review our cancellation policy below before proceeding."`
- **L480:** Replace `"Aurora customer journey"` → `"Book Your Appointment"`
- **L505:** Replace `"Loading Aurora catalog options..."` → `"Finding available services..."`
- **L517:** Replace `"Aurora location"` → `"Select a business"`
- **L549:** Replace `"Aurora guide"` → `"Select a staff member"`
- **L585:** Replace `"Loading available Aurora times..."` → `"Finding available times..."`
- **L619:** Replace `"Next action: select a slot, then confirm your details."` → `"Select a time to continue."`
- **L636:** Replace entire section with cancellation policy disclosure (add after pricing): _"Your booking can be cancelled up to 24 hours before the appointment time. Refund will be processed within 5 business days."_
- **L644:** Replace `"Checkout"` section label → `"Complete Your Booking"`
- **L665:** Replace `"Pay now"` button → `"Confirm and Pay"` (clearer primary action)
- **L657:** Replace `"hold is fallback"` comment → remove; only show "Confirm and Pay" button
- **L692:** Replace `"Sending Aurora journey updates..."` → `"Confirming your booking..."`

**Rationale:** Eliminates internal codenames ("Aurora"), clarifies flow, adds transparency gate (policy disclosure) before payment.

---

#### `src/pages/bookings-page.tsx`

- **L139:** Replace `"Simulate deterministic slot conflict"` → (Remove in production; hide in QA mode)
- **L166–173:** Replace entire simulation section → (Hide in production build)
- **L150:** Replace `"Creating booking intent..."` → `"Reserving your slot..."`
- **L154:** Replace `"Intent error ({code}): {message}"` → `"We couldn't reserve that slot. Please try another time or contact support."`
- **L179:** Replace `"Booking list error ({code}): {message}"` → `"We're having trouble loading your bookings. Please refresh the page."`
- **L215:** Replace `"Cancel error ({code}): {message}"` → `"We couldn't cancel that booking. Please try again or contact support."`
- **L175:** Replace `"Loading booking list..."` → `"Loading your bookings..."`

**Rationale:** Hide QA controls, replace technical errors with customer-friendly copy, use present-tense calm language ("Reserving").

---

#### `src/pages/availability-page.tsx`

- **L38:** Replace `"Select a service and staff baseline in Catalog first."` → `"Choose a service and staff member to see available times."`
- **L76:** Replace `"Catalog discovery"` → `"Choose a Service"`
- **L86:** Replace `"Loading deterministic availability slots..."` → `"Finding available times..."`
- **L97:** Replace `"No deterministic slots available for this baseline."` → `"No times available for this selection. Try another date or staff member."`
- **L112:** Replace `"Select slot"` → `"Pick This Time"`

**Rationale:** Remove "deterministic" jargon, clarify next steps, use customer-friendly language.

---

#### `src/pages/catalog-page.tsx`

- **L76:** Replace `"Catalog discovery"` → `"Browse Services"`
- **L82:** Replace `"Catalog error ({code}): {message}"` → `"We're having trouble loading services. Please refresh the page."`
- **L106:** Replace `"No deterministic services for this business."` → `"No services available. Please contact support."`
- **L131:** Replace `"Staff baseline"` → `"Choose Your Staff Member"`

**Rationale:** Remove internal terminology, provide recovery guidance in errors.

---

#### `src/pages/provider-ops-page.tsx`

- **L155:** Replace `"Provider operations baseline"` → `"Admin: Manage Bookings"` (or hide from customer view)
- **L170:** Replace `"Simulate deterministic queue load error"` → (Remove; QA mode)
- **L173:** Replace `"Loading provider queue and calendar baseline..."` → `"Loading dashboard..."`
- **L233:** Replace `"Simulate deterministic status conflict"` → (Remove; QA mode)
- **L296:** Replace `"Simulate deterministic slot service unavailable"` → (Remove; QA mode)

**Rationale:** Provider page should not be customer-facing. Hide QA toggles.

---

### **P1 (High): Component Affordances + Error Recovery**

#### `src/components/atoms/status-chip.tsx`

- Add `variant` prop to map statuses to colors:
  - `confirmed` → green (trustworthy)
  - `pending` → amber (calm, but waiting)
  - `cancelled` → gray (neutral)
- Update rendering: `<span className={getVariantClass(variant)}>{label}</span>`

**Rationale:** Visual clarity; users instantly see status health.

---

#### `src/components/atoms/section-heading.tsx`

- **L9:** Change subtitle font size from `text-sm` to `text-base` (increase readability)
- **L10:** Change subtitle color from `text-muted-foreground` to `text-foreground` (reduce ambiguity)

**Rationale:** Disclosure text (policies) must be readable.

---

#### `src/components/ui/button.tsx`

- Add `isPrimary` prop to highlight next action:
  - `default` variant + `isPrimary={true}` → bold, high contrast (CTA)
  - `outline` variant → secondary (optional action)

**Rationale:** Flow clarity; user knows which button to click.

---

### **P2 (Medium): Tone Consistency**

#### `src/pages/bookings-page.tsx`

- **L132:** Replace `"Create booking intent"` heading → `"Reserve This Appointment"`
- **L133:** Replace section label → `"Your Reservation"`

**Rationale:** "Intent" is internal API vocabulary.

---

#### `src/components/molecules/route-tabs.tsx`

- Audit tab labels to ensure they map to booking workflow steps:
  - `"Discover"` → `"Browse"`
  - `"Select"` → `"Choose Time"`
  - `"Confirm"` → `"Review"`
  - `"Checkout"` → `"Payment"`

**Rationale:** Step labels should guide users through canonical flow.

---

#### `src/App.tsx`

- **L129:** Replace `"M1 Recovery — Golden path execution"` → `"Booking System"`
- **L128:** Replace subtitle `"Recovery phase: execute the customer golden path with deterministic services"` → `"Complete your appointment in minutes"`

**Rationale:** Avoid internal process language; reassure customer.

---

## 4. Severity & Priority Summary

| Priority | Count | Issues |
|----------|-------|--------|
| 🔴 **P0 (Blocking)** | 3 major | Aurora terminology, missing policy disclosure, dead-end flow guidance |
| 🟠 **P1 (High)** | 4 | Component affordances, error recovery, status clarity |
| 🟡 **P2 (Medium)** | 3 | Tone consistency, internal terminology, heading readability |

**Total Copy/Component Fixes:** ~45 strings across 7 files

---

## 5. Validation Checklist for B2

Before executing this audit, confirm:

- [ ] **Clarity:** No customer-facing instance of "Aurora," "deterministic," "baseline," "intent," or internal API terms.
- [ ] **Trust:** Pricing + cancellation policy visible before "Complete" button.
- [ ] **Calm:** No urgency language; all buttons/messages use present-tense ("Reserving" not "will reserve").
- [ ] **Flow:** Every step has visible next action; no dead-end screens.
- [ ] **QA Controls:** Simulation checkboxes hidden in production build (conditional rendering).
- [ ] **Components:** Status chips have color coding; section headings are readable; buttons have clear affordance.

---

## 6. Files Requiring Changes

| File | Changes | Type |
|------|---------|------|
| `src/pages/customer-journey-page.tsx` | 14 line replacements | Copy + logic |
| `src/pages/bookings-page.tsx` | 8 line replacements | Copy |
| `src/pages/availability-page.tsx` | 5 line replacements | Copy |
| `src/pages/catalog-page.tsx` | 4 line replacements | Copy |
| `src/pages/provider-ops-page.tsx` | 5 line replacements | Copy |
| `src/components/atoms/status-chip.tsx` | 1 enhancement | Component |
| `src/components/atoms/section-heading.tsx` | 2 line replacements | Copy |
| `src/components/ui/button.tsx` | 1 enhancement | Component |
| `src/App.tsx` | 2 line replacements | Copy |

**Total Impact:** ~42 changes across 9 files. All non-breaking to component interfaces; purely UX/copy.

---

## Next Steps (B2 Lane)

1. **Copy Replacement:** Execute P0 fixes in customer-journey-page.tsx (transparency gate first).
2. **Error Handling:** Implement customer-friendly error messages in bookings-page, availability-page, catalog-page.
3. **Component Enhancements:** Add status-chip colors, section-heading readability, button affordance.
4. **QA Controls:** Hide simulation checkboxes behind `process.env.NODE_ENV === 'development'` guard.
5. **Validation:** Run audit again post-implementation; verify no internal terminology visible.

---

**Audit prepared by:** Copilot CLI (m1-brand-b1-audit)  
**Ready for B2 execution:** YES — fix list is unambiguous and actionable.
