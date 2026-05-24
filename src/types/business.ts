export type BusinessId = string

export interface Business {
  id: BusinessId
  name: string
  timezone: string
  isActive: boolean
}

export interface BusinessSummary {
  id: BusinessId
  name: string
}
