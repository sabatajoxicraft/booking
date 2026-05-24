/**
 * Edge Case Handlers - Deterministic handling for prioritized edge cases
 * from R1 resilience audit with explicit user-safe recovery paths.
 *
 * Implements handlers for critical and high-priority scenarios (E1-E6):
 * - E1: Slot lost during selection
 * - E2: Booking intent expiration
 * - E3: Network timeout during commit
 * - E4: Validation fails after submission
 * - E5: Provider unavailable mid-flow
 * - E6: Browser close / session recovery
 */

import type { ApiErrorContract } from '@/types/api'
import type { BookingIntent } from '@/types/booking'
import type { CustomerId } from '@/types/customer'

/**
 * Error recovery action a user can take
 */
export type RecoveryAction = 'retry' | 'restart' | 'select-alternative' | 'support-contact'

/**
 * User-safe error message with recovery guidance
 */
export interface EdgeCaseErrorResponse {
  /** Calm, non-technical error message */
  message: string
  /** Detailed context for transparency */
  detail?: string
  /** Primary recovery action for the user */
  primaryAction: RecoveryAction
  /** Optional secondary action */
  secondaryAction?: RecoveryAction
  /** Edge case identifier for logging/monitoring */
  edgeCaseId: string
  /** Whether automatic retry should be attempted */
  autoRetryable: boolean
  /** Retry delay in milliseconds (0 if no retry) */
  retryDelayMs: number
}

/**
 * E1: Slot lost during selection
 * Slot becomes unavailable between selection and commit.
 */
export function handleSlotLostError(): EdgeCaseErrorResponse {
  return {
    message: "This slot is no longer available. Let's find another time.",
    detail: 'The slot you selected was just booked by another guest. Good news—we found similar times available.',
    primaryAction: 'select-alternative',
    secondaryAction: 'restart',
    edgeCaseId: 'E1',
    autoRetryable: true,
    retryDelayMs: 500,
  }
}

/**
 * E2: Booking intent expiration
 * Detects TTL expiration and shows clear recovery path.
 */
export function handleIntentExpiredError(): EdgeCaseErrorResponse {
  return {
    message: "Your booking session has expired. No worries—let's start a fresh one.",
    detail: 'Your session was open for too long. All your details are ready to go again.',
    primaryAction: 'restart',
    edgeCaseId: 'E2',
    autoRetryable: false,
    retryDelayMs: 0,
  }
}

/**
 * E3: Network timeout during commit
 * Implement retry-with-idempotency and polling confirmation.
 */
export function handleCommitTimeoutError(): EdgeCaseErrorResponse {
  return {
    message: 'Just making sure your booking was created...',
    detail: "The booking request took longer than expected. We're confirming the status.",
    primaryAction: 'retry',
    secondaryAction: 'support-contact',
    edgeCaseId: 'E3',
    autoRetryable: true,
    retryDelayMs: 2000,
  }
}

/**
 * E4: Validation fails late
 * Show specific field errors and allow fix + resubmit.
 */
export function handleValidationFailedError(fieldName?: string): EdgeCaseErrorResponse {
  const fieldContext = fieldName ? ` (${fieldName})` : ''
  return {
    message: `Let's fix one detail${fieldContext} and try again.`,
    detail: fieldName
      ? `Please update the ${fieldName} field and we'll continue.`
      : "A detail needs adjustment before we can complete the booking.",
    primaryAction: 'retry',
    edgeCaseId: 'E4',
    autoRetryable: false,
    retryDelayMs: 0,
  }
}

/**
 * E5: Provider unavailable mid-flow
 * Detect and show notification with reschedule option.
 */
export function handleProviderUnavailableError(): EdgeCaseErrorResponse {
  return {
    message: "The provider just blocked this time. Let's find an alternative.",
    detail: 'The provider made a schedule change. Similar times are available.',
    primaryAction: 'select-alternative',
    secondaryAction: 'restart',
    edgeCaseId: 'E5',
    autoRetryable: true,
    retryDelayMs: 1000,
  }
}

/**
 * E6: Browser close recovery
 * Session recovery from localStorage state.
 */
export function handleSessionRecoveryAvailable(): EdgeCaseErrorResponse {
  return {
    message: "Welcome back! We found your booking in progress.",
    detail: 'Your selections are ready to complete.',
    primaryAction: 'retry',
    edgeCaseId: 'E6',
    autoRetryable: true,
    retryDelayMs: 0,
  }
}

/**
 * Generic network error recovery handler
 */
export function handleNetworkError(): EdgeCaseErrorResponse {
  return {
    message: 'Connection interrupted. Lets reconnect.',
    detail: "We'll automatically retry your request.",
    primaryAction: 'retry',
    secondaryAction: 'support-contact',
    edgeCaseId: 'NETWORK',
    autoRetryable: true,
    retryDelayMs: 1000,
  }
}

/**
 * Generic rate limit / server overload handler
 */
export function handleServerOverloadError(): EdgeCaseErrorResponse {
  return {
    message: "We're busy right now. Retrying in a moment...",
    detail: 'High demand is causing delays. We will keep trying.',
    primaryAction: 'retry',
    edgeCaseId: 'E9',
    autoRetryable: true,
    retryDelayMs: 3000,
  }
}

/**
 * Convert API error to user-safe edge case response
 */
export function mapApiErrorToEdgeCase(error: ApiErrorContract): EdgeCaseErrorResponse {
  switch (error.code) {
    case 'NOT_FOUND':
      return {
        message: "We couldn't find that. Let's start fresh.",
        detail: error.message,
        primaryAction: 'restart',
        edgeCaseId: 'NOT_FOUND',
        autoRetryable: false,
        retryDelayMs: 0,
      }
    case 'VALIDATION_ERROR':
      return handleValidationFailedError(error.details)
    case 'CONFLICT':
      return handleSlotLostError()
    case 'UNAVAILABLE':
      return handleProviderUnavailableError()
    case 'INVALID_TRANSITION':
      return {
        message: 'The booking needs to start over from the beginning.',
        detail: 'The current step is no longer valid. Lets restart.',
        primaryAction: 'restart',
        edgeCaseId: 'INVALID_TRANSITION',
        autoRetryable: false,
        retryDelayMs: 0,
      }
    default:
      return {
        message: 'Something unexpected happened. Lets try again.',
        detail: error.message,
        primaryAction: 'retry',
        secondaryAction: 'support-contact',
        edgeCaseId: 'UNKNOWN',
        autoRetryable: true,
        retryDelayMs: 1000,
      }
  }
}

/**
 * Intent TTL State for E2 handling
 */
export interface IntentTTLState {
  intent: BookingIntent
  createdAtMs: number
  lastExtendedAtMs: number
}

/**
 * Check if booking intent is expired (E2)
 */
export function isIntentExpired(ttlState: IntentTTLState, currentTimeMs: number): boolean {
  const expiresAtMs = new Date(ttlState.intent.expiresAtIso).getTime()
  return currentTimeMs >= expiresAtMs
}

/**
 * Calculate time remaining in intent TTL (E2)
 */
export function getIntentTimeRemainingMs(ttlState: IntentTTLState, currentTimeMs: number): number {
  const expiresAtMs = new Date(ttlState.intent.expiresAtIso).getTime()
  const remaining = expiresAtMs - currentTimeMs
  return Math.max(0, remaining)
}

/**
 * Check if intent is nearing expiration (for warning) (E2)
 */
export function isIntentNearExpiration(ttlState: IntentTTLState, currentTimeMs: number): boolean {
  const remaining = getIntentTimeRemainingMs(ttlState, currentTimeMs)
  const expiresAtMs = new Date(ttlState.intent.expiresAtIso).getTime()
  const createdAtMs = new Date(ttlState.intent.expiresAtIso).getTime()
  const totalDurationMs = expiresAtMs - createdAtMs + 600000 // Add 10min to estimate total
  return remaining < totalDurationMs * 0.25 // Less than 25% remaining
}

/**
 * Session persistence for E6 (browser close recovery)
 */
export interface SessionSnapshot {
  selectedBusinessId?: string
  selectedServiceId?: string
  selectedStaffId?: string
  selectedDateIso?: string
  selectedSlotId?: string
  customerId?: CustomerId
  customerDetails?: {
    name?: string
    email?: string
    phone?: string
  }
  snapshotTimeMs: number
}

const SESSION_STORAGE_KEY = 'booking_session_snapshot'
const SESSION_SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Save session state to localStorage (E6)
 */
export function saveSessionSnapshot(snapshot: SessionSnapshot): void {
  try {
    snapshot.snapshotTimeMs = Date.now()
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot))
  } catch (e) {
    console.warn('Failed to save session snapshot:', e)
  }
}

/**
 * Restore session state from localStorage (E6)
 */
export function restoreSessionSnapshot(): SessionSnapshot | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!stored) return null

    const snapshot = JSON.parse(stored) as SessionSnapshot
    const now = Date.now()
    const age = now - snapshot.snapshotTimeMs

    // Check if snapshot is still valid (within TTL)
    if (age > SESSION_SNAPSHOT_TTL_MS) {
      clearSessionSnapshot()
      return null
    }

    return snapshot
  } catch (e) {
    console.warn('Failed to restore session snapshot:', e)
    return null
  }
}

/**
 * Clear session snapshot from localStorage (E6)
 */
export function clearSessionSnapshot(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch (e) {
    console.warn('Failed to clear session snapshot:', e)
  }
}

/**
 * Idempotency key for request deduplication (E3, E7)
 */
export function generateIdempotencyKey(
  customerId: CustomerId,
  intentId: string,
  timestamp: number,
): string {
  // Simple hash: combine customerId + intentId + timestamp
  const combined = `${customerId}:${intentId}:${timestamp}`
  // Use a simple but deterministic approach
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `${combined}:${Math.abs(hash)}`
}

/**
 * Retry strategy with exponential backoff
 */
export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number // 0-1, multiplied by current delay
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
}

/**
 * Calculate retry delay with exponential backoff and jitter
 */
export function calculateRetryDelayMs(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelayMs,
  )
  const jitter = exponentialDelay * config.jitterFactor * Math.random()
  return Math.floor(exponentialDelay + jitter)
}

/**
 * Request timeout implementation with polling confirmation
 * For E3: Network timeout during commit
 */
export interface TimeoutConfig {
  timeoutMs: number
  pollIntervalMs: number
  maxPolls: number
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  timeoutMs: 10000,
  pollIntervalMs: 1000,
  maxPolls: 3,
}

/**
 * Format TTL countdown for display (E2)
 * Returns human-readable format: "5:32" (5min 32sec)
 */
export function formatTTLCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const padSeconds = String(seconds).padStart(2, '0')
  return `${minutes}:${padSeconds}`
}

/**
 * Determine warning level for TTL countdown
 * Returns 'normal' | 'warning' | 'alert'
 */
export function getTTLWarningLevel(
  ttlState: IntentTTLState,
  currentTimeMs: number,
): 'normal' | 'warning' | 'alert' {
  const expiresAtMs = new Date(ttlState.intent.expiresAtIso).getTime()
  const totalDurationMs = expiresAtMs - ttlState.createdAtMs
  const remaining = expiresAtMs - currentTimeMs

  if (remaining < 0) return 'alert'
  if (remaining < totalDurationMs * 0.25) return 'alert' // < 25%
  if (remaining < totalDurationMs * 0.5) return 'warning' // < 50%
  return 'normal'
}

/**
 * Prevent double-submission with button debounce
 * For E7: Concurrent booking attempts
 */
export class SubmissionDebouncer {
  private lastSubmitTimeMs: number = 0
  private debounceWindowMs: number

  constructor(debounceWindowMs: number = 2000) {
    this.debounceWindowMs = debounceWindowMs
  }

  /**
   * Check if submission should be allowed
   */
  canSubmit(currentTimeMs: number = Date.now()): boolean {
    return currentTimeMs - this.lastSubmitTimeMs >= this.debounceWindowMs
  }

  /**
   * Record submission and mark debounce window
   */
  recordSubmission(currentTimeMs: number = Date.now()): void {
    this.lastSubmitTimeMs = currentTimeMs
  }

  /**
   * Reset debounce state
   */
  reset(): void {
    this.lastSubmitTimeMs = 0
  }
}

/**
 * Availability re-sync tracker
 * For E1, E5: Periodic re-validation of slot availability
 */
export class AvailabilityResyncTracker {
  private lastResyncTimeMs: number = 0
  private resyncIntervalMs: number

  constructor(resyncIntervalMs: number = 30000) {
    this.resyncIntervalMs = resyncIntervalMs
  }

  /**
   * Check if re-sync should be triggered
   */
  shouldResync(currentTimeMs: number = Date.now()): boolean {
    return currentTimeMs - this.lastResyncTimeMs >= this.resyncIntervalMs
  }

  /**
   * Record re-sync
   */
  recordResync(currentTimeMs: number = Date.now()): void {
    this.lastResyncTimeMs = currentTimeMs
  }

  /**
   * Get time until next re-sync (ms)
   */
  getTimeUntilNextResyncMs(currentTimeMs: number = Date.now()): number {
    const nextResyncTimeMs = this.lastResyncTimeMs + this.resyncIntervalMs
    return Math.max(0, nextResyncTimeMs - currentTimeMs)
  }
}
