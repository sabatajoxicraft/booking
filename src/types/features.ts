import type { CustomerId } from '@/types/customer'

export interface Waitlist {
  id: string
  customerId: CustomerId
  serviceId: string
  dateRangeStart: string
  dateRangeEnd: string
  position: number
  notifiedAt?: Date
  createdAt: Date
}

export type NotificationChannel = 'email' | 'sms' | 'push'
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered'

export interface WaitlistNotification {
  id: string
  waitlistId: string
  channel: NotificationChannel
  status: NotificationStatus
  sentAt?: Date
  failureReason?: string
}

export interface ProviderTimeOff {
  id: string
  providerId: string
  startDate: string
  endDate: string
  reason: string
  createdAt: Date
}
