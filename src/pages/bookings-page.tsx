import { useEffect, useState } from 'react'

import { StatusChip } from '@/components/atoms/status-chip'
import { Button } from '@/components/ui/button'
import type { BookingService } from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { Booking, BookingIntent, BookingStatus, CreateBookingIntentInput } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { ServiceId } from '@/types/service'

type BookingsLoadState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; bookings: Booking[] }

type IntentCreateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; intent: BookingIntent }

type CancelBookingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; bookingId: string }

const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
}

interface BookingsPageProps {
  bookingService: BookingService
  businessId: BusinessId
  selectedServiceId: ServiceId | null
  selectedSlotId: AvailabilitySlotId | null
  customerId: CustomerId
  intents: BookingIntent[]
  onIntentCreated: (intent: BookingIntent) => void
}

export function BookingsPage({
  bookingService,
  businessId,
  selectedServiceId,
  selectedSlotId,
  customerId,
  intents,
  onIntentCreated,
}: BookingsPageProps) {
  const [bookingsState, setBookingsState] = useState<BookingsLoadState>({ status: 'loading' })
  const [intentState, setIntentState] = useState<IntentCreateState>({ status: 'idle' })
  const [cancelState, setCancelState] = useState<CancelBookingState>({ status: 'idle' })

  useEffect(() => {
    const loadInitialBookings = async () => {
      setBookingsState({ status: 'loading' })
      const listResponse = await bookingService.listBookings(customerId)

      if (listResponse.status === 'failure') {
        setBookingsState({ status: 'error', error: listResponse.error })
        return
      }

      setBookingsState({ status: 'success', bookings: listResponse.data })
    }

    void loadInitialBookings()
  }, [bookingService, customerId])

  const canCreateIntent = Boolean(selectedServiceId && selectedSlotId)

  const handleCancelBooking = async (bookingId: string) => {
    setCancelState({ status: 'loading' })
    const response = await bookingService.cancelBooking({
      bookingId,
      customerId,
      reason: 'customer_requested',
    })

    if (response.status === 'failure') {
      setCancelState({ status: 'error', error: response.error })
      return
    }

    setCancelState({ status: 'success', bookingId })
    setBookingsState({ status: 'loading' })
    const listResponse = await bookingService.listBookings(customerId)
    if (listResponse.status === 'failure') {
      setBookingsState({ status: 'error', error: listResponse.error })
      return
    }
    setBookingsState({ status: 'success', bookings: listResponse.data })
  }

  const handleCreateIntent = async () => {
    if (!selectedServiceId || !selectedSlotId) {
      return
    }

    const payload: CreateBookingIntentInput = {
      businessId,
      serviceId: selectedServiceId,
      slotId: selectedSlotId,
      customerId,
    }

    setIntentState({ status: 'loading' })
    const response = await bookingService.createBookingIntent(payload)
    if (response.status === 'failure') {
      setIntentState({ status: 'error', error: response.error })
      return
    }

    setIntentState({ status: 'success', intent: response.data })
    onIntentCreated(response.data)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Your Bookings</h2>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Reserve This Appointment</h3>
        <p className="text-sm text-muted-foreground">Your Reservation</p>
        {!canCreateIntent && (
          <p className="text-sm text-muted-foreground">
            Select a service and availability slot before making a reservation.
          </p>
        )}
        <Button type="button" size="sm" onClick={() => void handleCreateIntent()} disabled={!canCreateIntent}>
          Reserve Slot
        </Button>
        {intentState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Reserving your slot...</p>
        )}
        {intentState.status === 'error' && (
          <p className="text-sm text-destructive">
            We couldn't reserve that slot. Please try another time or contact support.
          </p>
        )}
        {intentState.status === 'success' && (
          <p className="text-sm text-foreground">
            Reservation confirmed and expires at {intentState.intent.expiresAtIso}.
          </p>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Existing bookings</h3>
        {bookingsState.status === 'loading' && (
          <p className="text-sm text-muted-foreground">Loading your bookings...</p>
        )}
        {bookingsState.status === 'error' && (
          <p className="text-sm text-destructive">
            We're having trouble loading your bookings. Please refresh the page.
          </p>
        )}
        {bookingsState.status === 'success' && (
          <>
            {bookingsState.bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings found for this customer.</p>
            ) : (
              <ul className="space-y-2">
                {bookingsState.bookings.map((booking) => (
                  <li key={booking.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                    <p className="text-sm text-muted-foreground">
                      {booking.id} · {booking.serviceId} · {new Date(booking.startIso).toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusChip label={BOOKING_STATUS_LABELS[booking.status]} />
                      {booking.status !== 'cancelled' && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCancelBooking(booking.id)}
                          disabled={cancelState.status === 'loading'}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {cancelState.status === 'error' && (
          <p className="text-sm text-destructive">
            We couldn't cancel that booking. Please try again or contact support.
          </p>
        )}
        {cancelState.status === 'success' && (
          <p className="text-sm text-foreground">Booking {cancelState.bookingId} cancelled.</p>
        )}
      </section>

      <section className="space-y-2 rounded border p-3">
        <h3 className="text-sm font-medium">Recent Reservations</h3>
        {intents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent reservations.</p>
        ) : (
          <ul className="space-y-2">
            {intents.map((intent) => (
              <li key={intent.intentId} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                <p className="text-sm text-muted-foreground">
                  {intent.intentId} · slot {intent.bookingDraft.slotId} · expires {intent.expiresAtIso}
                </p>
                <StatusChip label={BOOKING_STATUS_LABELS.pending} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
