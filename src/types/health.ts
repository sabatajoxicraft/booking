export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down'

export interface ServiceHealthComponent {
  name: string
  status: ServiceHealthStatus
  detail: string
}

export interface SystemHealthSnapshot {
  checkedAtIso: string
  components: ServiceHealthComponent[]
}
