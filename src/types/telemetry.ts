export type JourneyStep = 'discover' | 'select' | 'customer-details' | 'confirm' | 'checkout' | 'notify'

export type JourneyEventType = 'step_viewed' | 'step_completed' | 'dropoff'

export interface JourneyTelemetryEvent {
  atIso: string
  step: JourneyStep
  type: JourneyEventType
  reason?: string
  businessId: string
  serviceId?: string | null
  slotId?: string | null
}
