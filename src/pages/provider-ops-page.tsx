import { useEffect, useMemo, useState } from 'react'

import { StatusChip } from '@/components/atoms/status-chip'
import { Button } from '@/components/ui/button'
import { filterItemsByQuery, isServiceSearchEmpty } from '@/lib/service-search'
import type { HealthService, ProviderOperationsService } from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlotState } from '@/types/availability-slot'
import type { BookingStatus } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { SystemHealthSnapshot } from '@/types/health'
import type {
  ProviderAvailabilityActionResult,
  ProviderBookingActionResult,
  ProviderBookingsView,
} from '@/types/provider-ops'

type ProviderViewState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; view: ProviderBookingsView }

type ProviderActionState<TData> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; result: TData }

type HealthState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; data: SystemHealthSnapshot }

type BulkActionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string }

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
}

const SLOT_STATE_OPTIONS: AvailabilitySlotState[] = ['open', 'held', 'blocked']

interface ProviderOpsPageProps {
  providerService: ProviderOperationsService
  healthService: HealthService
  businessId: BusinessId
}

export function ProviderOpsPage({ providerService, healthService, businessId }: ProviderOpsPageProps) {
  const [viewState, setViewState] = useState<ProviderViewState>({ status: 'loading' })
  const [healthState, setHealthState] = useState<HealthState>({ status: 'loading' })
  const [bookingActionState, setBookingActionState] = useState<ProviderActionState<ProviderBookingActionResult>>({
    status: 'idle',
  })
  const [slotActionState, setSlotActionState] = useState<ProviderActionState<ProviderAvailabilityActionResult>>({
    status: 'idle',
  })

  const [selectedBookingId, setSelectedBookingId] = useState<string>('')
  const [nextBookingStatus, setNextBookingStatus] = useState<BookingStatus>('confirmed')
  const [selectedSlotId, setSelectedSlotId] = useState<string>('')
  const [nextSlotState, setNextSlotState] = useState<AvailabilitySlotState>('open')
  const [providerSearchQuery, setProviderSearchQuery] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkConfirmed, setBulkConfirmed] = useState(false)
  const [bulkActionState, setBulkActionState] = useState<BulkActionState>({ status: 'idle' })

  useEffect(() => {
    let isMounted = true

    const loadView = async () => {
      setViewState({ status: 'loading' })
      const response = await providerService.getBookingsView(businessId)

      if (!isMounted) {
        return
      }

      if (response.status === 'failure') {
        setViewState({ status: 'error', error: response.error })
        return
      }

      setViewState({ status: 'success', view: response.data })
    }

    void loadView()

    return () => {
      isMounted = false
    }
  }, [providerService, businessId])

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

  const reloadView = async () => {
    setViewState({ status: 'loading' })
    const response = await providerService.getBookingsView(businessId)

    if (response.status === 'failure') {
      setViewState({ status: 'error', error: response.error })
      return
    }

    setViewState({ status: 'success', view: response.data })
  }

  const bookingOptions = viewState.status === 'success' ? viewState.view.queueGroups.flatMap((group) => group.bookings) : []
  const slotOptions = viewState.status === 'success' ? viewState.view.slotSnapshots : []
  const hasProviderSearch = !isServiceSearchEmpty(providerSearchQuery)

  const filteredQueueGroups = useMemo(() => {
    if (viewState.status !== 'success') {
      return []
    }

    return viewState.view.queueGroups
      .map((group) => ({
        ...group,
        bookings: filterItemsByQuery(group.bookings, providerSearchQuery, (booking) =>
          [
            booking.bookingId,
            booking.customerId,
            booking.serviceId,
            booking.staffId,
            booking.slotId,
            booking.startIso,
            booking.endIso,
            booking.status,
          ].join(' '),
        ),
      }))
      .filter((group) => group.bookings.length > 0)
  }, [providerSearchQuery, viewState])

  const filteredCalendarDays = useMemo(() => {
    if (viewState.status !== 'success') {
      return []
    }

    return viewState.view.calendarDays
      .map((day) => ({
        ...day,
        bookings: filterItemsByQuery(day.bookings, providerSearchQuery, (booking) =>
          [booking.bookingId, booking.customerId, booking.serviceId, booking.startIso, booking.endIso, booking.status].join(
            ' ',
          ),
        ),
      }))
      .filter((day) => day.bookings.length > 0)
  }, [providerSearchQuery, viewState])

  const filteredSlotSnapshots = useMemo(() => {
    if (viewState.status !== 'success') {
      return []
    }

    return filterItemsByQuery(viewState.view.slotSnapshots, providerSearchQuery, (slot) =>
      [slot.slotId, slot.startIso, slot.endIso, slot.state, slot.isBookable ? 'bookable' : 'unavailable'].join(' '),
    )
  }, [providerSearchQuery, viewState])

  const pendingBookings = viewState.status === 'success'
    ? viewState.view.queueGroups.find((group) => group.status === 'pending')?.bookings ?? []
    : []

  const dayPlanCards = useMemo(() => {
    if (viewState.status !== 'success') {
      return []
    }

    return viewState.view.calendarDays.slice(0, 2).map((day, index) => {
      const confirmed = day.bookings.filter((booking) => booking.status === 'confirmed').length
      const pending = day.bookings.filter((booking) => booking.status === 'pending').length
      return {
        label: index === 0 ? 'Today' : 'Next day',
        dateIso: day.dateIso,
        total: day.bookings.length,
        confirmed,
        pending,
      }
    })
  }, [viewState])

  const effectiveSelectedBookingId =
    selectedBookingId && bookingOptions.some((booking) => booking.bookingId === selectedBookingId)
      ? selectedBookingId
      : bookingOptions[0]?.bookingId ?? ''

  const effectiveSelectedSlotId =
    selectedSlotId && slotOptions.some((slot) => slot.slotId === selectedSlotId)
      ? selectedSlotId
      : slotOptions[0]?.slotId ?? ''

  const handleBookingStatusUpdate = async () => {
    if (!effectiveSelectedBookingId) {
      return
    }

    setBookingActionState({ status: 'loading' })
    const response = await providerService.updateBookingStatus({
      bookingId: effectiveSelectedBookingId,
      nextStatus: nextBookingStatus,
      actorId: 'provider_demo',
      reason: 'provider-status-update',
    })

    if (response.status === 'failure') {
      setBookingActionState({ status: 'error', error: response.error })
      return
    }

    setBookingActionState({ status: 'success', result: response.data })
    await reloadView()
  }

  const handleBulkCancelPending = async () => {
    if (!bulkConfirmed) {
      setBulkActionState({ status: 'error', message: 'Confirm the bulk action before proceeding.' })
      return
    }
    if (bulkReason.trim().length < 8) {
      setBulkActionState({ status: 'error', message: 'Provide a clear reason (at least 8 characters).' })
      return
    }
    if (pendingBookings.length === 0) {
      setBulkActionState({ status: 'error', message: 'No pending bookings are available for bulk cancellation.' })
      return
    }

    setBulkActionState({ status: 'loading' })
    let cancelledCount = 0

    for (const booking of pendingBookings) {
      const response = await providerService.updateBookingStatus({
        bookingId: booking.bookingId,
        nextStatus: 'cancelled',
        actorId: 'provider_bulk_action',
        reason: `bulk-cancel:${bulkReason.trim()}`,
      })

      if (response.status === 'success') {
        cancelledCount += 1
      }
    }

    await reloadView()
    setBulkActionState({
      status: 'success',
      message: `Bulk action complete. Cancelled ${cancelledCount} pending booking(s).`,
    })
    setBulkConfirmed(false)
    setBulkReason('')
  }

  const handleSlotUpdate = async () => {
    if (!effectiveSelectedSlotId) {
      return
    }

    setSlotActionState({ status: 'loading' })
    const response = await providerService.updateAvailabilitySlotState({
      slotId: effectiveSelectedSlotId,
      nextState: nextSlotState,
      actorId: 'provider_demo',
      reason: 'provider-slot-update',
    })

    if (response.status === 'failure') {
      setSlotActionState({ status: 'error', error: response.error })
      return
    }

    setSlotActionState({ status: 'success', result: response.data })
    await reloadView()
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Admin: Manage Bookings</h2>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Service health</h3>
        {healthState.status === 'loading' && <p className="text-sm text-muted-foreground">Checking platform health...</p>}
        {healthState.status === 'error' && (
          <p className="text-sm text-destructive">
            Health check unavailable ({healthState.error.code}). Provider actions are still available.
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
        <h3 className="text-sm font-medium">Day plan summary</h3>
        {dayPlanCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">Day-plan summary will appear after provider data is loaded.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {dayPlanCards.map((card) => (
              <div key={card.dateIso} className="rounded border p-2 text-sm">
                <p className="font-medium">
                  {card.label} · {card.dateIso}
                </p>
                <p className="text-muted-foreground">
                  Total {card.total} · Confirmed {card.confirmed} · Pending {card.pending}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Queue and calendar view</h3>
          <div className="flex flex-wrap gap-2">
            {hasProviderSearch && (
              <Button type="button" size="sm" variant="outline" onClick={() => setProviderSearchQuery('')}>
                Clear search
              </Button>
            )}
            <Button type="button" size="sm" variant="outline" onClick={() => void reloadView()}>
              Refresh
            </Button>
          </div>
        </div>
        <label className="flex max-w-sm flex-col gap-1 text-sm">
          Search bookings and slots
          <input
            type="search"
            value={providerSearchQuery}
            onChange={(event) => setProviderSearchQuery(event.target.value)}
            placeholder="Search by booking, customer, service, slot, or status"
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        {viewState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        )}
        {viewState.status === 'error' && (
          <p className="text-sm text-destructive">
            Provider view error ({viewState.error.code}): {viewState.error.message}
          </p>
        )}
        {viewState.status === 'success' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Generated: {viewState.view.generatedAtIso}</p>
            {hasProviderSearch && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredQueueGroups.reduce((total, group) => total + group.bookings.length, 0)} queue items and{' '}
                {filteredSlotSnapshots.length} slots across the current dashboard ordering.
              </p>
            )}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Queue groups</h4>
              {filteredQueueGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {hasProviderSearch
                    ? 'No bookings match this search. Try a booking ID, customer ID, service ID, slot ID, or status.'
                    : 'No bookings in the dashboard yet.'}
                </p>
              ) : (
                filteredQueueGroups.map((group) => (
                  <div key={group.status} className="space-y-1 rounded border p-2">
                    <p className="text-xs font-medium">{group.label}</p>
                    <ul className="space-y-1">
                      {group.bookings.map((booking) => (
                        <li key={booking.bookingId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span>
                            {booking.bookingId} · {new Date(booking.startIso).toLocaleString()} · {booking.customerId}
                          </span>
                          <StatusChip label={BOOKING_STATUS_LABELS[booking.status]} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Calendar groups</h4>
              {filteredCalendarDays.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {hasProviderSearch
                    ? 'No calendar days match this search.'
                    : 'No calendar data available for this business.'}
                </p>
              ) : (
                filteredCalendarDays.map((day) => (
                  <div key={day.dateIso} className="rounded border p-2">
                    <p className="text-xs font-medium">{day.dateIso}</p>
                    <ul className="mt-1 space-y-1">
                      {day.bookings.map((booking) => (
                        <li key={booking.bookingId} className="text-xs text-muted-foreground">
                          {booking.bookingId} · {new Date(booking.startIso).toLocaleTimeString()}-
                          {new Date(booking.endIso).toLocaleTimeString()} · {BOOKING_STATUS_LABELS[booking.status]}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Slot snapshots</h4>
              {filteredSlotSnapshots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {hasProviderSearch
                    ? 'No slots match this search.'
                    : 'No slot snapshots available for this business.'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {filteredSlotSnapshots.map((slot) => (
                    <li key={slot.slotId} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span>
                        {slot.slotId} · {new Date(slot.startIso).toLocaleTimeString()}-
                        {new Date(slot.endIso).toLocaleTimeString()} · {slot.state}
                      </span>
                      <StatusChip label={slot.isBookable ? 'Bookable' : 'Locked'} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Bulk actions (guardrails enabled)</h3>
        <p className="text-xs text-muted-foreground">
          This action cancels all pending bookings for the selected business and requires explicit confirmation.
        </p>
        <label className="flex flex-col gap-1 text-sm">
          Bulk action reason
          <input
            value={bulkReason}
            onChange={(event) => setBulkReason(event.target.value)}
            placeholder="Explain why this bulk action is needed"
            className="rounded border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={bulkConfirmed} onChange={(event) => setBulkConfirmed(event.target.checked)} />
          I understand this will cancel all pending bookings.
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void handleBulkCancelPending()}
          disabled={bulkActionState.status === 'loading'}
        >
          Cancel all pending bookings
        </Button>
        {bulkActionState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Applying bulk cancellation...</p>
        )}
        {bulkActionState.status === 'error' && <p className="text-sm text-destructive">{bulkActionState.message}</p>}
        {bulkActionState.status === 'success' && <p className="text-sm text-foreground">{bulkActionState.message}</p>}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Booking status action</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Booking
            <select
              value={effectiveSelectedBookingId}
              onChange={(event) => setSelectedBookingId(event.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
              disabled={bookingOptions.length === 0}
            >
              {bookingOptions.map((booking) => (
                <option key={booking.bookingId} value={booking.bookingId}>
                  {booking.bookingId} ({BOOKING_STATUS_LABELS[booking.status]})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Next status
            <select
              value={nextBookingStatus}
              onChange={(event) => setNextBookingStatus(event.target.value as BookingStatus)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirm</option>
              <option value="cancelled">Decline</option>
            </select>
          </label>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleBookingStatusUpdate()}
          disabled={!effectiveSelectedBookingId}
        >
          Update booking status
        </Button>
        {bookingActionState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Applying provider booking status update...</p>
        )}
        {bookingActionState.status === 'error' && (
          <p className="text-sm text-destructive">
            Booking action error ({bookingActionState.error.code}): {bookingActionState.error.message}
          </p>
        )}
        {bookingActionState.status === 'success' && (
          <p className="text-sm text-foreground">
            Booking {bookingActionState.result.booking.id}: {bookingActionState.result.previousStatus} →{' '}
            {bookingActionState.result.nextStatus} ({bookingActionState.result.audit.actionId})
          </p>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Availability slot state action</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Slot
            <select
              value={effectiveSelectedSlotId}
              onChange={(event) => setSelectedSlotId(event.target.value)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
              disabled={slotOptions.length === 0}
            >
              {slotOptions.map((slot) => (
                <option key={slot.slotId} value={slot.slotId}>
                  {slot.slotId} ({slot.state})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Next slot state
            <select
              value={nextSlotState}
              onChange={(event) => setNextSlotState(event.target.value as AvailabilitySlotState)}
              className="rounded border border-border bg-background px-2 py-1 text-sm"
            >
              {SLOT_STATE_OPTIONS.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
        </div>
        <Button type="button" size="sm" onClick={() => void handleSlotUpdate()} disabled={!effectiveSelectedSlotId}>
          Update slot state
        </Button>
        {slotActionState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Applying provider slot state update...</p>
        )}
        {slotActionState.status === 'error' && (
          <p className="text-sm text-destructive">
            Slot action error ({slotActionState.error.code}): {slotActionState.error.message}
          </p>
        )}
        {slotActionState.status === 'success' && (
          <p className="text-sm text-foreground">
            Slot {slotActionState.result.slot.id}: {slotActionState.result.previousState} → {slotActionState.result.nextState} (
            {slotActionState.result.audit.actionId})
          </p>
        )}
      </section>
    </div>
  )
}
