import { CircuitBreaker } from '@/services/circuit-breaker'
import type { ServiceHealth, AggregatedHealth, ServiceHealthStatus } from '@/types/resilience'

interface ServiceCircuitBreaker {
  name: string
  breaker: CircuitBreaker
}

export class ResilientService {
  private circuitBreakers: Map<string, ServiceCircuitBreaker> = new Map()

  constructor() {
    this.initializeCircuitBreakers()
  }

  private initializeCircuitBreakers(): void {
    const services = ['payment', 'provider', 'notification', 'catalog']

    for (const service of services) {
      this.circuitBreakers.set(service, {
        name: service,
        breaker: new CircuitBreaker({
          failureThreshold: 5,
          timeout: 5000,
          resetTimeout: 30000,
        }),
      })
    }
  }

  async executeWithCircuitBreaker<T>(
    serviceCall: () => Promise<T>,
    serviceName: string,
    fallback?: T,
  ): Promise<T> {
    const cb = this.circuitBreakers.get(serviceName)

    if (!cb) {
      throw new Error(`Unknown service: ${serviceName}`)
    }

    return cb.breaker.execute(serviceCall, fallback)
  }

  getServiceHealth(serviceName?: string): ServiceHealth | ServiceHealth[] {
    if (serviceName) {
      const cb = this.circuitBreakers.get(serviceName)
      if (!cb) {
        throw new Error(`Unknown service: ${serviceName}`)
      }
      return this.buildServiceHealth(cb)
    }

    return Array.from(this.circuitBreakers.values()).map((cb) => this.buildServiceHealth(cb))
  }

  getAggregatedHealth(): AggregatedHealth {
    const healthArray = this.getServiceHealth() as ServiceHealth[]
    const overallStatus = this.computeOverallStatus(healthArray)

    return {
      timestamp: new Date(),
      overallStatus,
      services: healthArray,
    }
  }

  private buildServiceHealth(serviceCB: ServiceCircuitBreaker): ServiceHealth {
    const metrics = serviceCB.breaker.getMetrics()
    const state = serviceCB.breaker.getState()

    return {
      serviceName: serviceCB.name,
      status: this.circuitBreakerStateToHealthStatus(state),
      circuitBreakerState: state,
      failureCount: metrics.failureCount,
      lastFailureTime: metrics.lastFailureTime,
    }
  }

  private circuitBreakerStateToHealthStatus(state: string): ServiceHealthStatus {
    switch (state) {
      case 'closed':
        return 'ok'
      case 'half-open':
        return 'degraded'
      case 'open':
        return 'down'
      default:
        return 'ok'
    }
  }

  private computeOverallStatus(healthArray: ServiceHealth[]): ServiceHealthStatus {
    const hasDown = healthArray.some((h) => h.status === 'down')
    if (hasDown) return 'down'

    const hasDegraded = healthArray.some((h) => h.status === 'degraded')
    if (hasDegraded) return 'degraded'

    return 'ok'
  }

  resetService(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName)
    if (cb) {
      cb.breaker.reset()
    }
  }

  resetAll(): void {
    for (const cb of this.circuitBreakers.values()) {
      cb.breaker.reset()
    }
  }
}
