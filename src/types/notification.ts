export type BookingNotificationTone = 'success' | 'warning' | 'error'

export type BookingLifecycleEventKind =
  | 'booking_confirmed'
  | 'booking_held'
  | 'payment_retry'
  | 'payment_failed'

export interface BookingLifecycleEvent {
  kind: BookingLifecycleEventKind
  intentId: string
  paymentStatus?: 'success' | 'retry' | 'failure'
}

export interface BookingNotification {
  headline: string
  detail: string
  nextAction: string
  tone: BookingNotificationTone
}
