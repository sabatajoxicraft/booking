import { useEffect, useMemo, useState } from 'react'

import { StatusChip } from '@/components/atoms/status-chip'
import { Button } from '@/components/ui/button'
import { filterItemsByQuery, isServiceSearchEmpty } from '@/lib/service-search'
import type { ProviderOperationsService } from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlotState } from '@/types/availability-slot'
import type { BookingStatus } from '@/types/booking'
import type { BusinessId } from '@/types/business'
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

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
}

const SLOT_STATE_OPTIONS: AvailabilitySlotState[] = ['open', 'held', 'blocked']

interface ProviderOpsPageProps {
  providerService: ProviderOperationsService
  businessId: BusinessId
}

export function ProviderOpsPage({ providerService, businessId }: ProviderOpsPageProps) {
  const [viewState, setViewState] = useState<ProviderViewState>({ status: 'loading' })
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
