import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { StatusChip } from '@/components/atoms/status-chip'
import { Button } from '@/components/ui/button'
import { filterItemsByQuery, isServiceSearchEmpty } from '@/lib/service-search'
import type {
  AvailabilityQueryService,
  BookingService,
  CatalogDiscoveryService,
  HealthService,
  NotificationService,
  PaymentService,
  ProviderOperationsService,
  TelemetryService,
} from '@/services/interfaces'
import { waitlistService } from '@/services/mock-services'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { BookingIntent } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId, CustomerProfile } from '@/types/customer'
import { validateCustomerDetails } from '@/types/customer'
import type { SystemHealthSnapshot } from '@/types/health'
import type { BookingNotification } from '@/types/notification'
import type { PaymentMethod, PaymentOutcome } from '@/types/payment'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'
import type { JourneyEventType, JourneyStep } from '@/types/telemetry'

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

type PaymentState =
  | { status: 'idle' }
  | { status: 'processing'; method: PaymentMethod }
  | { status: 'success'; outcome: PaymentOutcome }
  | { status: 'retry'; outcome: PaymentOutcome }
  | { status: 'failure'; outcome: PaymentOutcome }

type NotificationState =
  | { status: 'idle'; message: string }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; data: BookingNotification }

type ProgressStatus = 'pending' | 'active' | 'complete' | 'error'

type CustomerReview = {
  serviceId: ServiceId
  rating: number
  quote: string
  reviewerLabel: string
  dateLabel: string
}

const CUSTOMER_REVIEWS: CustomerReview[] = [
  {
    serviceId: 'svc_consult',
    rating: 5,
    quote: 'Clear steps, calm guidance, and no surprises during checkout.',
    reviewerLabel: 'Verified customer',
    dateLabel: 'Jan 2026',
  },
  {
    serviceId: 'svc_consult',
    rating: 5,
    quote: 'Fast to book and easy to understand from start to finish.',
    reviewerLabel: 'Verified customer',
    dateLabel: 'Jan 2026',
  },
]

interface CustomerJourneyPageProps {
  catalogService: CatalogDiscoveryService
  availabilityService: AvailabilityQueryService
  bookingService: BookingService
  paymentService: PaymentService
  notificationService: NotificationService
  healthService: HealthService
  telemetryService: TelemetryService
  providerService: ProviderOperationsService
  selectedBusinessId: BusinessId
  selectedServiceId: ServiceId | null
  selectedStaffId: StaffId | null
  selectedDateIso: string
  selectedSlotId: AvailabilitySlotId | null
  customerProfile: CustomerProfile
  onProfileChange: (profile: CustomerProfile) => void
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
  paymentService,
  notificationService,
  healthService,
  telemetryService,
  providerService,
  selectedBusinessId,
  selectedServiceId,
  selectedStaffId,
  selectedDateIso,
  selectedSlotId,
  customerProfile,
  onProfileChange,
  onBusinessSelect,
  onServiceSelect,
  onStaffSelect,
  onDateChange,
  onSlotSelect,
  onIntentCreated,
}: CustomerJourneyPageProps) {
  const customerId: CustomerId = customerProfile.id

  const [discoverState, setDiscoverState] = useState<
    LoadState<{
      businesses: Array<{ id: BusinessId; name: string }>
      businessName: string
      services: Array<{
        id: ServiceId
        name: string
        durationMinutes: number
        priceLabel: string
        priceCents: number
        currency: 'ZAR'
      }>
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
  const [paymentState, setPaymentState] = useState<PaymentState>({ status: 'idle' })
  const [notifyState, setNotifyState] = useState<NotificationState>({
    status: 'idle',
    message: 'Your booking details are confirmed. Review our cancellation policy below before proceeding.',
  })
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [waitlistAdded, setWaitlistAdded] = useState(false)
  const [serviceQuery, setServiceQuery] = useState('')
  const [healthState, setHealthState] = useState<LoadState<SystemHealthSnapshot>>({ status: 'loading' })
  const trackedEventKeysRef = useRef<Set<string>>(new Set())

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
            priceCents: service.priceCents,
            currency: service.currency,
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
    const loadHealth = async () => {
      setHealthState({ status: 'loading' })
      const response = await healthService.getSystemHealth()
      if (response.status === 'failure') {
        setHealthState({ status: 'error', error: response.error })
        return
      }
      setHealthState({ status: 'success', data: response.data })
    }

    void loadHealth()
  }, [healthService])

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

  const recommendedService = useMemo(() => {
    if (discoverState.status !== 'success') {
      return null
    }
    if (selectedService) {
      return selectedService
    }

    return discoverState.data.services[0] ?? null
  }, [discoverState, selectedService])

  const recommendedStaff = useMemo(() => {
    if (discoverState.status !== 'success' || !recommendedService) {
      return null
    }

    if (selectedStaff && selectedStaff.serviceIds.includes(recommendedService.id)) {
      return selectedStaff
    }

    return discoverState.data.staff.find((staffMember) => staffMember.serviceIds.includes(recommendedService.id)) ?? null
  }, [discoverState, recommendedService, selectedStaff])

  const recommendedSlots = useMemo(() => {
    if (selectUiState.status !== 'success') {
      return []
    }

    return selectUiState.data.filter((slot) => slot.isBookable).slice(0, 2)
  }, [selectUiState])

  const reviewState = useMemo(() => {
    if (discoverState.status !== 'success') {
      return { status: 'idle' as const, message: 'Load the service list to see verified customer reviews.' }
    }

    if (!selectedServiceId) {
      return { status: 'idle' as const, message: 'Choose a service to read customer feedback.' }
    }

    const reviews = CUSTOMER_REVIEWS.filter((review) => review.serviceId === selectedServiceId)
    if (reviews.length === 0) {
      return { status: 'empty' as const, message: 'No customer reviews are available for this service yet.' }
    }

    return { status: 'success' as const, reviews }
  }, [discoverState.status, selectedServiceId])

  const customerDetailsState = useMemo(() => validateCustomerDetails(customerProfile), [customerProfile])

  const filteredServices = useMemo(() => {
    if (discoverState.status !== 'success') {
      return []
    }

    return filterItemsByQuery(discoverState.data.services, serviceQuery, (service) =>
      [
        service.name,
        service.id,
        `${service.durationMinutes} minutes`,
        `${service.durationMinutes}m`,
        service.priceLabel,
      ].join(' '),
    )
  }, [discoverState, serviceQuery])

  const hasServiceSearch = !isServiceSearchEmpty(serviceQuery)
  const selectedServiceHiddenBySearch =
    discoverState.status === 'success' &&
    selectedServiceId !== null &&
    !filteredServices.some((service) => service.id === selectedServiceId)

  const trackJourneyEvent = useCallback((step: JourneyStep, type: JourneyEventType, reason?: string) => {
    const key = `${step}:${type}:${reason ?? 'none'}:${selectedBusinessId}:${selectedServiceId ?? 'none'}:${selectedSlotId ?? 'none'}`
    if (trackedEventKeysRef.current.has(key)) {
      return
    }

    trackedEventKeysRef.current.add(key)
    void telemetryService.trackJourneyEvent({
      atIso: new Date().toISOString(),
      step,
      type,
      reason,
      businessId: selectedBusinessId,
      serviceId: selectedServiceId,
      slotId: selectedSlotId,
    })
  }, [selectedBusinessId, selectedServiceId, selectedSlotId, telemetryService])

  useEffect(() => {
    if (discoverState.status === 'success') {
      trackJourneyEvent('discover', 'step_completed')
      return
    }
    if (discoverState.status === 'error') {
      trackJourneyEvent('discover', 'dropoff', discoverState.error.code)
    }
  }, [discoverState, trackJourneyEvent])

  useEffect(() => {
    if (selectUiState.status === 'success') {
      trackJourneyEvent('select', 'step_completed')
      return
    }
    if (selectUiState.status === 'error') {
      trackJourneyEvent('select', 'dropoff', selectUiState.error.code)
    }
  }, [selectUiState, trackJourneyEvent])

  useEffect(() => {
    if (customerDetailsState.status === 'success') {
      trackJourneyEvent('customer-details', 'step_completed')
      return
    }
    if (customerDetailsState.status === 'error') {
      trackJourneyEvent('customer-details', 'dropoff', customerDetailsState.message)
    }
  }, [customerDetailsState, trackJourneyEvent])

  useEffect(() => {
    if (checkoutState.status === 'success') {
      trackJourneyEvent('checkout', 'step_completed')
      return
    }
    if (checkoutState.status === 'error') {
      trackJourneyEvent('checkout', 'dropoff', checkoutState.error.code)
    }
  }, [checkoutState, trackJourneyEvent])

  useEffect(() => {
    if (notifyState.status === 'success') {
      trackJourneyEvent('notify', 'step_completed')
      return
    }
    if (notifyState.status === 'error') {
      trackJourneyEvent('notify', 'dropoff', notifyState.error.code)
    }
  }, [notifyState, trackJourneyEvent])

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
    if (customerDetailsState.status !== 'success') {
      return { status: 'idle', message: 'Complete your contact details to proceed to checkout.' }
    }

    return { status: 'success', message: 'Your booking details are confirmed. Review our cancellation policy below before proceeding.' }
  }, [customerDetailsState.status, discoverState.status, selectUiState.status, selectedService, selectedSlot, selectedStaff])

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
      return 'Next action: select a slot in Select, then complete your customer details.'
    }
    if (customerDetailsState.status === 'error') {
      return `Next action: fix your contact details — ${customerDetailsState.message}`
    }
    if (customerDetailsState.status !== 'success') {
      return 'Next action: complete your contact details (name and email) to unlock checkout.'
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
    if (paymentState.status === 'retry') {
      return 'Next action: retry payment with card to complete the booking.'
    }
    if (paymentState.status === 'failure') {
      return 'Next action: try another payment method or use the hold fallback.'
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
  }, [checkoutState, customerDetailsState, discoverState.status, notifyState, paymentState.status, selectUiState.status, selectedSlot])

  const runNotifyOutcome = async (mode: CheckoutMode, intent: BookingIntent, paymentOutcome?: PaymentOutcome) => {
    setNotifyState({ status: 'loading' })

    const eventKind =
      mode === 'hold'
        ? 'booking_held'
        : paymentOutcome?.status === 'success'
          ? 'booking_confirmed'
          : paymentOutcome?.status === 'retry'
            ? 'payment_retry'
            : 'payment_failed'

    const response = await notificationService.publishBookingLifecycleEvent({
      kind: eventKind,
      intentId: intent.intentId,
      paymentStatus: paymentOutcome?.status,
    })

    if (response.status === 'failure') {
      setNotifyState({ status: 'error', error: response.error })
      return
    }

    setNotifyState({ status: 'success', data: response.data })
  }

  const handleCheckout = async (mode: CheckoutMode) => {
    if (!selectedService || !selectedSlot) {
      setCheckoutState({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: 'Confirm your service and time before checkout.' },
      })
      return
    }

    if (customerDetailsState.status !== 'success') {
      setCheckoutState({
        status: 'error',
        error: { code: 'VALIDATION_ERROR', message: customerDetailsState.message },
      })
      return
    }

    setCheckoutState({ status: 'loading', mode })
    setPaymentState({ status: 'idle' })
    const intentResponse = await bookingService.createBookingIntent({
      businessId: selectedBusinessId,
      serviceId: selectedService.id,
      slotId: selectedSlot.id,
      customerId,
      customerDetails: {
        fullName: customerProfile.fullName.trim(),
        email: customerProfile.email.trim(),
        phoneE164: customerProfile.phoneE164?.trim() || undefined,
      },
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

      setPaymentState({ status: 'idle' })
    }

    setCheckoutState({ status: 'success', mode, intent })
    onIntentCreated(intent)

    if (mode === 'pay') {
      setPaymentState({ status: 'processing', method: paymentMethod })
      const paymentResponse = await paymentService.processPayment({
        intentId: intent.intentId,
        amountCents: selectedService.priceCents,
        currency: selectedService.currency,
        paymentMethod,
      })

      if (paymentResponse.status === 'failure') {
        setPaymentState({
          status: 'failure',
          outcome: { status: 'failure', message: paymentResponse.error.message },
        })
        setCheckoutState({ status: 'error', error: { code: 'UNAVAILABLE', message: paymentResponse.error.message } })
        await runNotifyOutcome(mode, intent)
        return
      }

      setPaymentState(
        paymentResponse.data.status === 'success'
          ? { status: 'success', outcome: paymentResponse.data }
          : paymentResponse.data.status === 'retry'
            ? { status: 'retry', outcome: paymentResponse.data }
            : { status: 'failure', outcome: paymentResponse.data },
      )

      await runNotifyOutcome(mode, intent, paymentResponse.data)
      return
    }

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
      note: selectedSlot ? 'Time selected — complete your customer details to continue.' : 'Choose an available time slot.',
    },
    {
      title: '3. Customer details',
      status:
        customerDetailsState.status === 'error'
          ? 'error'
          : customerDetailsState.status === 'success'
            ? 'complete'
            : selectedSlot
              ? 'active'
              : 'pending',
      note: customerDetailsState.message,
    },
    {
      title: '4. Confirm details',
      status: confirmState.status === 'error' ? 'error' : confirmState.status === 'success' ? 'complete' : 'pending',
      note: confirmState.message,
    },
    {
      title: '5. Checkout',
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
        paymentState.status === 'retry'
          ? 'Payment retry required.'
          : paymentState.status === 'failure'
            ? 'Payment failed; choose another method or hold fallback.'
            : checkoutState.status === 'success'
              ? checkoutState.mode === 'pay'
                ? 'Pay-now checkout completed.'
                : 'Hold fallback completed.'
              : 'Use Pay now for the golden path; Place hold is fallback.',
    },
    {
      title: '6. Notify / Outcome',
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
        <h3 className="text-sm font-medium">Service health</h3>
        {healthState.status === 'loading' && <p className="text-sm text-muted-foreground">Checking platform health...</p>}
        {healthState.status === 'error' && (
          <p className="text-sm text-destructive">
            Health check unavailable ({healthState.error.code}). Booking can continue.
          </p>
        )}
        {healthState.status === 'success' && (
          <ul className="space-y-1">
            {healthState.data.components.map((component) => (
              <li key={component.name} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="capitalize">{component.name}</span>
                <span className="text-muted-foreground">
                  {component.status} · {component.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

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
              {recommendedService && recommendedStaff && (
                <p className="text-xs text-muted-foreground">
                  Recommended next choice: {recommendedService.name} with {recommendedStaff.displayName}.
                </p>
              )}
              <label className="flex max-w-sm flex-col gap-1 text-sm">
                Search services
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={serviceQuery}
                    onChange={(event) => setServiceQuery(event.target.value)}
                    placeholder="Search by service name, duration, or price"
                    className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                  />
                  {hasServiceSearch && (
                    <Button type="button" size="sm" variant="outline" onClick={() => setServiceQuery('')}>
                      Clear
                    </Button>
                  )}
                </div>
              </label>
              {discoverState.data.services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No services are available for this business. Try another business or contact support.
                </p>
              ) : filteredServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No services match "{serviceQuery.trim()}". Try a shorter search or switch business.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredServices.map((service) => (
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
              )}
              {hasServiceSearch && filteredServices.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Showing {filteredServices.length} of {discoverState.data.services.length} services.
                </p>
              )}
              {selectedServiceHiddenBySearch && (
                <p className="text-xs text-muted-foreground">
                  Your selected service is hidden by the current search. Clear the search to review it again.
                </p>
              )}
              {recommendedService && selectedServiceId !== recommendedService.id && (
                <Button type="button" size="sm" variant="outline" onClick={() => onServiceSelect(recommendedService.id)}>
                  Use recommended service
                </Button>
              )}
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
        {recommendedSlots.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Recommended times: {recommendedSlots.map((slot) => new Date(slot.startIso).toLocaleTimeString()).join(', ')}.
          </p>
        )}
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
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No available times for this selection. Try another date or staff member.
                </p>
                {!waitlistAdded && selectedServiceId && selectedDateIso && (
                  <div className="rounded border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-amber-900 mb-2">
                      Or join the waitlist to get notified when availability opens up.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await waitlistService.addToWaitlist(
                          customerId,
                          selectedServiceId,
                          selectedDateIso,
                          selectedDateIso,
                        )
                        setWaitlistAdded(true)
                      }}
                    >
                      Join Waitlist
                    </Button>
                  </div>
                )}
                {waitlistAdded && (
                  <p className="text-xs text-green-700 font-medium">✓ You're on the waitlist. We'll notify you when availability opens.</p>
                )}
              </div>
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

      <section className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-medium">Customer details</h3>
        <p className="text-xs text-muted-foreground">
          Your contact details are used to confirm and communicate about your booking. Your customer ID is stable and
          cannot be changed.
        </p>
        <p className="text-xs text-muted-foreground">Customer ID: {customerProfile.id}</p>
        <div className="space-y-3">
          <label className="flex max-w-sm flex-col gap-1 text-sm">
            Full name <span className="text-destructive">*</span>
            <input
              type="text"
              value={customerProfile.fullName}
              onChange={(event) => {
                onProfileChange({ ...customerProfile, fullName: event.target.value })
              }}
              placeholder="Your full name"
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="flex max-w-sm flex-col gap-1 text-sm">
            Email address <span className="text-destructive">*</span>
            <input
              type="email"
              value={customerProfile.email}
              onChange={(event) => {
                onProfileChange({ ...customerProfile, email: event.target.value })
              }}
              placeholder="name@example.com"
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          <label className="flex max-w-sm flex-col gap-1 text-sm">
            Phone (optional, E.164 format)
            <input
              type="tel"
              value={customerProfile.phoneE164 ?? ''}
              onChange={(event) => {
                onProfileChange({ ...customerProfile, phoneE164: event.target.value || undefined })
              }}
              placeholder="+27821234567"
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            />
          </label>
          {customerDetailsState.status === 'error' && (
            <p className="text-sm text-destructive">{customerDetailsState.message}</p>
          )}
          {customerDetailsState.status === 'success' && (
            <p className="text-sm text-foreground">✓ {customerDetailsState.message}</p>
          )}
          {customerDetailsState.status === 'idle' && (
            <p className="text-xs text-muted-foreground">{customerDetailsState.message}</p>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-medium">Customer reviews</h3>
        <p className="text-xs text-muted-foreground">
          Reviews are shown in a privacy-safe format without customer names or sensitive details.
        </p>
        {reviewState.status === 'idle' && <p className="text-sm text-muted-foreground">{reviewState.message}</p>}
        {reviewState.status === 'empty' && <p className="text-sm text-muted-foreground">{reviewState.message}</p>}
        {reviewState.status === 'success' && (
          <div className="space-y-2">
            {selectedService && (
              <p className="text-sm text-muted-foreground">Showing reviews for {selectedService.name}.</p>
            )}
            <ul className="space-y-2">
              {reviewState.reviews.map((review, index) => (
                <li key={`${review.serviceId}-${review.dateLabel}-${index}`} className="rounded border p-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{review.reviewerLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {review.rating}/5 · {review.dateLabel}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{review.quote}</p>
                </li>
              ))}
            </ul>
          </div>
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
            <p className="text-sm text-muted-foreground">
              {customerProfile.fullName} · {customerProfile.email}
              {customerProfile.phoneE164 ? ` · ${customerProfile.phoneE164}` : ''}
            </p>
            <p className="text-xs text-muted-foreground">
             Your booking can be cancelled up to 24 hours before the appointment time. Refund will be processed within 5 business days.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Complete Your Booking</h3>
        <label className="flex max-w-xs flex-col gap-1 text-sm">
          Payment method
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          >
            <option value="card">Card</option>
            <option value="wallet">Wallet</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCheckout('pay')}
            disabled={confirmState.status !== 'success' || customerDetailsState.status !== 'success' || checkoutState.status === 'loading'}
          >
            Pay now
          </Button>
        </div>
        {paymentState.status === 'processing' && (
          <p className="text-sm text-muted-foreground">Processing {paymentState.method} payment...</p>
        )}
        {paymentState.status === 'success' && (
          <p className="text-sm text-foreground">Payment successful: {paymentState.outcome.message}</p>
        )}
        {paymentState.status === 'retry' && (
          <p className="text-sm text-muted-foreground">
            Payment retry needed: {paymentState.outcome.message}. Try card to complete the booking.
          </p>
        )}
        {paymentState.status === 'failure' && (
          <p className="text-sm text-destructive">Payment failed: {paymentState.outcome.message}</p>
        )}
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
            <p className="text-sm font-medium">
              {notifyState.data.headline} <span className="text-xs text-muted-foreground">({notifyState.data.tone})</span>
            </p>
            <p className="text-sm text-muted-foreground">{notifyState.data.detail}</p>
            <p className="text-xs text-muted-foreground">{notifyState.data.nextAction}</p>
          </div>
        )}
      </section>
    </div>
  )
}
