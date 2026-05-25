import type { CircuitBreakerState, CircuitBreakerConfig, CircuitBreakerMetrics } from '@/types/resilience'

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed'
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: Date
  private lastStateChangeTime = Date.now()
  private metrics: CircuitBreakerMetrics
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig = { failureThreshold: 5, timeout: 5000, resetTimeout: 30000 }) {
    this.config = config
    this.metrics = {
      failureCount: 0,
      successCount: 0,
      stateChangeLog: [],
    }
  }

  async execute<R>(fn: () => Promise<R>, fallback?: R): Promise<R> {
    if (this.state === 'open') {
      if (Date.now() - this.lastStateChangeTime > this.config.resetTimeout) {
        this.changeState('half-open')
      } else if (fallback !== undefined) {
        return fallback
      } else {
        throw new Error('Circuit breaker is open and no fallback provided')
      }
    }

    try {
      const result = await Promise.race([
        fn(),
        this.createTimeout<R>(this.config.timeout),
      ])

      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()

      if (this.state === 'open' && fallback !== undefined) {
        return fallback
      }

      throw error
    }
  }

  private createTimeout<R>(ms: number): Promise<R> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker timeout after ${ms}ms`))
      }, ms)
    })
  }

  private onSuccess(): void {
    this.successCount++
    this.failureCount = 0

    if (this.state === 'half-open') {
      this.changeState('closed')
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()
    this.metrics.failureCount = this.failureCount
    this.metrics.lastFailureTime = this.lastFailureTime

    if (this.failureCount >= this.config.failureThreshold && this.state === 'closed') {
      this.changeState('open')
    }
  }

  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.state
    this.state = newState
    this.lastStateChangeTime = Date.now()

    this.metrics.stateChangeLog.push({
      from: oldState,
      to: newState,
      timestamp: new Date(),
    })
  }

  getState(): CircuitBreakerState {
    return this.state
  }

  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics }
  }

  reset(): void {
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
    this.changeState('closed')
  }
}
