export type PaymentMethod = 'card' | 'wallet' | 'manual'

export type PaymentStatus = 'success' | 'retry' | 'failure'

export interface PaymentRequest {
  intentId: string
  amountCents: number
  currency: 'ZAR'
  paymentMethod: PaymentMethod
}

export interface PaymentOutcome {
  status: PaymentStatus
  paymentReference?: string
  retryAfterMs?: number
  message: string
}
