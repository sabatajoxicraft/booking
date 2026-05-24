export type CustomerId = string

export interface CustomerProfile {
  id: CustomerId
  fullName: string
  email: string
  phoneE164?: string
}
