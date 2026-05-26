export type CustomerId = string

export interface CustomerProfile {
  id: CustomerId
  fullName: string
  email: string
  phoneE164?: string
}

/** Editable subset of CustomerProfile – id is always stable and excluded from user input. */
export type CustomerProfileInput = Omit<CustomerProfile, 'id'>

/** Validation result for editable customer details, preserving idle/error/success messaging semantics. */
export type CustomerDetailsValidationState = { status: 'idle' | 'error' | 'success'; message: string }

/** Prepares editable customer details for API submission by trimming and normalizing fields. */
export function prepareCustomerProfileInput(profile: CustomerProfileInput): CustomerProfileInput {
  return {
    fullName: profile.fullName.trim(),
    email: profile.email.trim(),
    phoneE164: profile.phoneE164?.trim() || undefined,
  }
}

/** Validates editable customer details without side-effects. */
export function validateCustomerDetails(profile: CustomerProfileInput): CustomerDetailsValidationState {
  const normalizedProfile = prepareCustomerProfileInput(profile)
  const { fullName: name, email, phoneE164: phone } = normalizedProfile

  if (!name && !email) {
    return { status: 'idle', message: 'Enter your name and email to continue.' }
  }
  if (!name) {
    return { status: 'error', message: 'Full name is required.' }
  }
  if (!email) {
    return { status: 'error', message: 'Email address is required.' }
  }
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    return { status: 'error', message: 'Enter a valid email address (e.g. name@example.com).' }
  }
  if (phone && !/^\+\d{7,15}$/.test(phone)) {
    return { status: 'error', message: 'Phone must be in E.164 format (e.g. +27821234567).' }
  }
  return { status: 'success', message: 'Contact details confirmed.' }
}
