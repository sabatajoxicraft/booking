export type CircuitBreakerState = 'closed' | 'open' | 'half-open'

export interface CircuitBreakerConfig {
  failureThreshold: number
  timeout: number
  resetTimeout: number
}

export type ServiceHealthStatus = 'ok' | 'degraded' | 'down'

export interface CircuitBreakerMetrics {
  failureCount: number
  lastFailureTime?: Date
  successCount: number
  stateChangeLog: Array<{
    from: CircuitBreakerState
    to: CircuitBreakerState
    timestamp: Date
  }>
}

export interface ServiceHealth {
  serviceName: string
  status: ServiceHealthStatus
  circuitBreakerState: CircuitBreakerState
  failureCount: number
  lastFailureTime?: Date
}

export interface AggregatedHealth {
  timestamp: Date
  overallStatus: ServiceHealthStatus
  services: ServiceHealth[]
}
