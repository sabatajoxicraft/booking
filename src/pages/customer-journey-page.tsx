import { useEffect, useMemo, useState } from 'react'

import { StatusChip } from '@/components/atoms/status-chip'
import { Button } from '@/components/ui/button'
import type {
  AvailabilityQueryService,
  BookingService,
  CatalogDiscoveryService,
  ProviderOperationsService,
} from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { BookingIntent } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

type LoadState<TData> =
  | { status: 'idle'; message: string }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; data: TData }

type CheckoutMode = 'pay' | 'hold'

type CheckoutState =
  | { status: 'idle' }
  | { status: 'loading'; mode: CheckoutMode }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; mode: CheckoutMode; intent: BookingIntent }

type NotifyState =
  | { status: 'idle'; message: string }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | {
      status: 'success'
      data: {
        headline: string
        detail: string
        nextAction: string
      }
    }

type ProgressStatus = 'pending' | 'active' | 'complete' | 'error'

interface CustomerJourneyPageProps {
  catalogService: CatalogDiscoveryService
  availabilityService: AvailabilityQueryService
  bookingService: BookingService
  providerService: ProviderOperationsService
  selectedBusinessId: BusinessId
  selectedServiceId: ServiceId | null
  selectedStaffId: StaffId | null
  selectedDateIso: string
  selectedSlotId: AvailabilitySlotId | null
  customerId: CustomerId
  onBusinessSelect: (businessId: BusinessId) => void
  onServiceSelect: (serviceId: ServiceId) => void
  onStaffSelect: (staffId: StaffId) => void
  onDateChange: (dateIso: string) => void
  onSlotSelect: (slotId: AvailabilitySlotId) => void
  onIntentCreated: (intent: BookingIntent) => void
}

export function CustomerJourneyPage({
  catalogService,
  availabilityService,
  bookingService,
  providerService,
  selectedBusinessId,
  selectedServiceId,
  selectedStaffId,
  selectedDateIso,
  selectedSlotId,
  customerId,
  onBusinessSelect,
  onServiceSelect,
  onStaffSelect,
  onDateChange,
  onSlotSelect,
  onIntentCreated,
}: CustomerJourneyPageProps) {
  const [discoverState, setDiscoverState] = useState<
    LoadState<{
      businesses: Array<{ id: BusinessId; name: string }>
      businessName: string
      services: Array<{ id: ServiceId; name: string; durationMinutes: number; priceLabel: string }>
      staff: Array<{ id: StaffId; displayName: string; serviceIds: ServiceId[] }>
    }>
  >({ status: 'loading' })

  const [selectState, setSelectState] = useState<
    LoadState<Array<{ id: AvailabilitySlotId; startIso: string; endIso: string; isBookable: boolean }>>
  >({
    status: 'idle',
    message: 'Select a service and staff member to see available times.',
  })

  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ status: 'idle' })
  const [notifyState, setNotifyState] = useState<NotifyState>({
    status: 'idle',
    message: 'Your booking details are confirmed. Review our cancellation policy below before proceeding.',
  })

  useEffect(() => {
    const loadDiscover = async () => {
      setDiscoverState({ status: 'loading' })

      const businessesResponse = await catalogService.listBusinesses()
      if (businessesResponse.status === 'failure') {
        setDiscoverState({ status: 'error', error: businessesResponse.error })
        return
      }

      const servicesResponse = await catalogService.listServicesByBusiness(selectedBusinessId)
      if (servicesResponse.status === 'failure') {
        setDiscoverState({ status: 'error', error: servicesResponse.error })
        return
      }

      const staffResponse = await catalogService.listStaffByBusiness(selectedBusinessId)
      if (staffResponse.status === 'failure') {
        setDiscoverState({ status: 'error', error: staffResponse.error })
        return
      }

      const businessName =
        businessesResponse.data.find((business) => business.id === selectedBusinessId)?.name ?? selectedBusinessId

      setDiscoverState({
        status: 'success',
        data: {
          businesses: businessesResponse.data.map((business) => ({ id: business.id, name: business.name })),
          businessName,
          services: servicesResponse.data.map((service) => ({
            id: service.id,
            name: service.name,
            durationMinutes: service.durationMinutes,
            priceLabel: `${service.currency} ${(service.priceCents / 100).toFixed(2)}`,
          })),
          staff: staffResponse.data.map((staffMember) => ({
            id: staffMember.id,
            displayName: staffMember.displayName,
            serviceIds: staffMember.serviceIds,
          })),
        },
      })
    }

    void loadDiscover()
  }, [catalogService, selectedBusinessId])

  useEffect(() => {
    if (!selectedServiceId || !selectedStaffId) {
      return
    }

    const loadAvailability = async () => {
      setSelectState({ status: 'loading' })

      const response = await availabilityService.findAvailability({
        businessId: selectedBusinessId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        dateIso: selectedDateIso,
      })

      if (response.status === 'failure') {
        setSelectState({ status: 'error', error: response.error })
        return
      }

      setSelectState({
        status: 'success',
        data: response.data.map((slot) => ({
          id: slot.id,
          startIso: slot.startIso,
          endIso: slot.endIso,
          isBookable: slot.isBookable,
        })),
      })
    }

    void loadAvailability()
  }, [availabilityService, selectedBusinessId, selectedServiceId, selectedStaffId, selectedDateIso])

  const selectUiState = useMemo<
    LoadState<Array<{ id: AvailabilitySlotId; startIso: string; endIso: string; isBookable: boolean }>>
  >(
    () =>
      !selectedServiceId || !selectedStaffId
        ? {
            status: 'idle',
            message: 'Choose a service and staff member in the catalog',
          }
        : selectState,
    [selectedServiceId, selectedStaffId, selectState],
  )

  useEffect(() => {
    if (selectUiState.status !== 'success') {
      return
    }

    if (selectedSlotId && selectUiState.data.some((slot) => slot.id === selectedSlotId && slot.isBookable)) {
      return
    }

    const firstBookableSlot = selectUiState.data.find((slot) => slot.isBookable)
    if (firstBookableSlot) {
      onSlotSelect(firstBookableSlot.id)
    }
  }, [selectUiState, selectedSlotId, onSlotSelect])

  const selectedService = useMemo(() => {
    if (discoverState.status !== 'success' || !selectedServiceId) {
      return null
    }
    return discoverState.data.services.find((service) => service.id === selectedServiceId) ?? null
  }, [discoverState, selectedServiceId])

  const selectedStaff = useMemo(() => {
    if (discoverState.status !== 'success' || !selectedStaffId) {
      return null
    }
    return discoverState.data.staff.find((staffMember) => staffMember.id === selectedStaffId) ?? null
  }, [discoverState, selectedStaffId])

  const selectedSlot = useMemo(() => {
    if (selectUiState.status !== 'success' || !selectedSlotId) {
      return null
    }
    return selectUiState.data.find((slot) => slot.id === selectedSlotId) ?? null
  }, [selectUiState, selectedSlotId])

  const confirmState: { status: 'idle' | 'error' | 'success'; message: string } = useMemo(() => {
    if (discoverState.status !== 'success') {
      return { status: 'idle', message: 'Choose a service and staff member to continue.' }
    }
    if (selectUiState.status !== 'success') {
      return { status: 'idle', message: 'Pick a time slot to proceed to review.' }
    }
    if (!selectedService || !selectedStaff || !selectedSlot) {
      return { status: 'error', message: 'Your selection is incomplete. Choose a service, staff member, and time.' }
    }

    return { status: 'success', message: 'Your booking details are confirmed. Review our cancellation policy below before proceeding.' }
  }, [discoverState.status, selectUiState.status, selectedService, selectedSlot, selectedStaff])

  const nextActionGuide = useMemo(() => {
    if (discoverState.status === 'loading') {
      return 'Next action: wait for Discover to finish loading.'
    }
    if (discoverState.status === 'error') {
      return 'Next action: retry Discover by switching business.'
    }
    if (discoverState.status !== 'success') {
      return 'Next action: start in Discover by choosing business, service, and guide.'
    }
    if (selectUiState.status === 'loading') {
      return 'Next action: wait for Select to finish loading times.'
    }
    if (selectUiState.status === 'error') {
      return 'Next action: adjust date or service, then retry Select.'
    }
    if (!selectedSlot) {
      return 'Next action: select a slot in Select, then confirm details.'
    }
    if (checkoutState.status === 'loading') {
      return checkoutState.mode === 'pay'
        ? 'Next action: wait while Pay now checkout is processing.'
        : 'Next action: wait while the hold fallback is being placed.'
    }
    if (checkoutState.status === 'error') {
      return 'Next action: retry checkout, starting with Pay now as the golden path.'
    }
    if (checkoutState.status === 'idle') {
      return 'Next action: run Checkout with Pay now (golden path); use Place hold only as fallback.'
    }
    if (notifyState.status === 'loading') {
      return 'Next action: wait for confirmation to finalize your booking.'
    }
    if (notifyState.status === 'error') {
      return 'Next action: retry checkout notify flow to complete recovery.'
    }
    if (notifyState.status === 'success') {
      return notifyState.data.nextAction
    }

    return 'Next action: continue through the golden path steps in order.'
  }, [checkoutState, discoverState.status, notifyState, selectUiState.status, selectedSlot])

  const runNotifyOutcome = async (mode: CheckoutMode, intent: BookingIntent) => {
    setNotifyState({ status: 'loading' })

    const bookingsResponse = await bookingService.listBookings(customerId)
    if (bookingsResponse.status === 'failure') {
      setNotifyState({ status: 'error', error: bookingsResponse.error })
      return
    }

    const providerResponse = await providerService.getBookingsView(selectedBusinessId)
    if (providerResponse.status === 'failure') {
      setNotifyState({ status: 'error', error: providerResponse.error })
      return
    }

    const matchingBooking = bookingsResponse.data.find((booking) => booking.slotId === intent.bookingDraft.slotId)
    const slotSnapshot = providerResponse.data.slotSnapshots.find(
      (snapshot) => snapshot.slotId === intent.bookingDraft.slotId,
    )

    if (mode === 'pay') {
      if (matchingBooking?.status === 'confirmed') {
        setNotifyState({
          status: 'success',
          data: {
            headline: 'Booking confirmed',
            detail: `Booking ${matchingBooking.id} is confirmed for your selected time.`,
            nextAction: 'Next action: Check your inbox for confirmation details.',
          },
        })
        return
      }

      setNotifyState({
        status: 'success',
        data: {
          headline: 'Payment processing',
          detail: `Your booking is being processed and awaiting final confirmation.`,
          nextAction: 'Next action: Watch for confirmation shortly.',
        },
      })
      return
    }

    if (slotSnapshot?.state === 'held') {
      setNotifyState({
        status: 'success',
        data: {
          headline: 'Slot reserved',
          detail: `Slot ${slotSnapshot.slotId} is now held while you finish checkout details.`,
          nextAction: 'Next action: Return soon to complete payment before the hold expires.',
        },
      })
      return
    }

    setNotifyState({
      status: 'success',
      data: {
        headline: 'Reservation submitted',
        detail: `Your reservation was submitted and is being processed.`,
        nextAction: 'Next action: Refresh Select if you want to pick another time.',
      },
    })
  }

  const handleCheckout = async (mode: CheckoutMode) => {
    if (!selectedService || !selectedSlot) {
      setCheckoutState({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'Confirm your service and time before checkout.' },
      })
      return
    }

    setCheckoutState({ status: 'loading', mode })
    const intentResponse = await bookingService.createBookingIntent({
      businessId: selectedBusinessId,
      serviceId: selectedService.id,
      slotId: selectedSlot.id,
      customerId,
    })

    if (intentResponse.status === 'failure') {
      setCheckoutState({ status: 'error', error: intentResponse.error })
      return
    }

    const intent = intentResponse.data

    if (mode === 'hold') {
      const holdResponse = await providerService.updateAvailabilitySlotState({
        slotId: selectedSlot.id,
        nextState: 'held',
        actorId: 'customer_journey',
        reason: 'customer-hold-request',
      })

      if (holdResponse.status === 'failure') {
        setCheckoutState({ status: 'error', error: holdResponse.error })
        return
      }
    }

    setCheckoutState({ status: 'success', mode, intent })
    onIntentCreated(intent)
    await runNotifyOutcome(mode, intent)
  }

  const progressSteps: Array<{ title: string; status: ProgressStatus; note: string }> = [
    {
      title: '1. Discover',
      status:
        discoverState.status === 'error'
          ? 'error'
          : discoverState.status === 'success'
            ? 'complete'
            : discoverState.status === 'loading'
              ? 'active'
              : 'pending',
      note:
        discoverState.status === 'success'
          ? 'Services and staff are available.'
          : 'Choose a service and staff member to see available times.',
    },
    {
      title: '2. Select',
      status:
        selectUiState.status === 'error'
          ? 'error'
          : selectedSlot
            ? 'complete'
            : selectUiState.status === 'loading'
              ? 'active'
              : discoverState.status === 'success'
                ? 'active'
                : 'pending',
      note: selectedSlot ? 'Time selected and ready to confirm.' : 'Choose an available time slot.',
    },
    {
      title: '3. Confirm details',
      status: confirmState.status === 'error' ? 'error' : confirmState.status === 'success' ? 'complete' : 'pending',
      note: confirmState.message,
    },
    {
      title: '4. Checkout',
      status:
        checkoutState.status === 'error'
          ? 'error'
          : checkoutState.status === 'success'
            ? 'complete'
            : checkoutState.status === 'loading'
              ? 'active'
              : confirmState.status === 'success'
                ? 'active'
                : 'pending',
      note:
        checkoutState.status === 'success'
          ? checkoutState.mode === 'pay'
            ? 'Pay-now checkout completed.'
            : 'Hold fallback completed.'
          : 'Use Pay now for the golden path; Place hold is fallback.',
    },
    {
      title: '5. Notify / Outcome',
      status:
        notifyState.status === 'error'
          ? 'error'
          : notifyState.status === 'success'
            ? 'complete'
            : notifyState.status === 'loading'
              ? 'active'
              : checkoutState.status === 'success'
                ? 'active'
                : 'pending',
      note:
        notifyState.status === 'success'
          ? notifyState.data.nextAction
          : 'Your confirmation will appear here after checkout.',
    },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-lg font-medium">Book Your Appointment</h2>
        <p className="text-sm text-muted-foreground">
          Complete your appointment in minutes with our simple, clear booking process.
        </p>
        <p className="text-sm font-medium text-foreground">{nextActionGuide}</p>
      </header>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Journey progress</h3>
        <ol className="space-y-2">
          {progressSteps.map((step) => (
            <li key={step.title} className="space-y-1 rounded border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{step.title}</p>
                <StatusChip label={step.status} />
              </div>
              <p className="text-xs text-muted-foreground">{step.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-medium">Discover</h3>
        {discoverState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Finding available services...</p>
        )}
        {discoverState.status === 'error' && (
          <p className="text-sm text-destructive">
            Discover error ({discoverState.error.code}): {discoverState.error.message}. Next action: retry by
            switching business.
          </p>
        )}
        {discoverState.status === 'success' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Business: {discoverState.data.businessName}</p>
            <div className="space-y-2">
              <p className="text-sm font-medium">Select a business</p>
              <div className="flex flex-wrap gap-2">
                {discoverState.data.businesses.map((business) => (
                  <Button
                    key={business.id}
                    type="button"
                    size="sm"
                    variant={business.id === selectedBusinessId ? 'default' : 'outline'}
                    onClick={() => onBusinessSelect(business.id)}
                  >
                    {business.name}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Service</p>
              <div className="flex flex-wrap gap-2">
                {discoverState.data.services.map((service) => (
                  <Button
                    key={service.id}
                    type="button"
                    size="sm"
                    variant={service.id === selectedServiceId ? 'default' : 'outline'}
                    onClick={() => onServiceSelect(service.id)}
                  >
                    {service.name} · {service.durationMinutes}m · {service.priceLabel}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Select a staff member</p>
              <div className="flex flex-wrap gap-2">
                {discoverState.data.staff.map((staffMember) => (
                  <Button
                    key={staffMember.id}
                    type="button"
                    size="sm"
                    variant={staffMember.id === selectedStaffId ? 'default' : 'outline'}
                    onClick={() => onStaffSelect(staffMember.id)}
                    disabled={selectedServiceId !== null && !staffMember.serviceIds.includes(selectedServiceId)}
                  >
                    {staffMember.displayName}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Next action: choose service and guide, then continue to Select.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-medium">Select</h3>
        <label className="flex max-w-xs flex-col gap-1 text-sm">
          Date
          <input
            type="date"
            value={selectedDateIso}
            onChange={(event) => onDateChange(event.target.value)}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        {selectUiState.status === 'idle' && <p className="text-sm text-muted-foreground">{selectUiState.message}</p>}
        {selectUiState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Finding available times...</p>
        )}
        {selectUiState.status === 'error' && (
          <p className="text-sm text-destructive">
            Select error ({selectUiState.error.code}): {selectUiState.error.message}. Next action: change date or
            service.
          </p>
        )}
        {selectUiState.status === 'success' && (
          <>
            {selectUiState.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No available times for this selection. Try another date or staff member.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectUiState.data.map((slot) => (
                  <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                    <p className="text-sm text-muted-foreground">
                      {new Date(slot.startIso).toLocaleString()} → {new Date(slot.endIso).toLocaleTimeString()}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant={slot.id === selectedSlotId ? 'default' : 'outline'}
                      onClick={() => onSlotSelect(slot.id)}
                      disabled={!slot.isBookable}
                    >
                      {slot.id === selectedSlotId ? 'Selected' : slot.isBookable ? 'Select slot' : 'Unavailable'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Select a time to continue.</p>
          </>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Confirm details</h3>
        {confirmState.status === 'idle' && <p className="text-sm text-muted-foreground">{confirmState.message}</p>}
        {confirmState.status === 'error' && <p className="text-sm text-destructive">{confirmState.message}</p>}
        {confirmState.status === 'success' && selectedService && selectedStaff && selectedSlot && (
          <div className="space-y-2">
            <p className="text-sm text-foreground">
              {selectedService.name} with {selectedStaff.displayName}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(selectedSlot.startIso).toLocaleString()} · {selectedService.priceLabel}
            </p>
            <p className="text-xs text-muted-foreground">
             Your booking can be cancelled up to 24 hours before the appointment time. Refund will be processed within 5 business days.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Complete Your Booking</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCheckout('pay')}
            disabled={confirmState.status !== 'success' || checkoutState.status === 'loading'}
          >
            Confirm and Pay
          </Button>
        </div>
        {checkoutState.status === 'idle' && (
          <p className="text-sm text-muted-foreground">
            Next action: use Pay now to continue the golden path. Place hold only if needed.
          </p>
        )}
        {checkoutState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">
            Confirming your booking...
          </p>
        )}
        {checkoutState.status === 'error' && (
          <p className="text-sm text-destructive">
            Checkout error ({checkoutState.error.code}): {checkoutState.error.message}. Next action: choose another
            slot or retry Pay now.
          </p>
        )}
        {checkoutState.status === 'success' && (
          <p className="text-sm text-foreground">
            {checkoutState.mode === 'pay' ? 'Pay-now checkout successful.' : 'Hold fallback successful.'} Intent{' '}
            {checkoutState.intent.intentId} is active.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Notify / Outcome</h3>
        {notifyState.status === 'idle' && <p className="text-sm text-muted-foreground">{notifyState.message}</p>}
        {notifyState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Confirming your booking...</p>
        )}
        {notifyState.status === 'error' && (
          <p className="text-sm text-destructive">
            Notify error ({notifyState.error.code}): {notifyState.error.message}. Next action: retry checkout.
          </p>
        )}
        {notifyState.status === 'success' && (
          <div className="space-y-1">
            <p className="text-sm font-medium">{notifyState.data.headline}</p>
            <p className="text-sm text-muted-foreground">{notifyState.data.detail}</p>
            <p className="text-xs text-muted-foreground">{notifyState.data.nextAction}</p>
          </div>
        )}
      </section>
    </div>
  )
}
