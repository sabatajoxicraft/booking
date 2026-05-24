import { SectionHeading } from '@/components/atoms/section-heading'
import { StatusChip } from '@/components/atoms/status-chip'
import { RouteTabs } from '@/components/molecules/route-tabs'

interface AppShellHeaderProps<TRouteKey extends string> {
  title: string
  subtitle: string
  statusLabel: string
  routes: Array<{
    key: TRouteKey
    label: string
  }>
  activeRoute: TRouteKey
  onRouteSelect: (routeKey: TRouteKey) => void
}

export function AppShellHeader<TRouteKey extends string>({
  title,
  subtitle,
  statusLabel,
  routes,
  activeRoute,
  onRouteSelect,
}: AppShellHeaderProps<TRouteKey>) {
  return (
    <header className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeading title={title} subtitle={subtitle} />
        <StatusChip label={statusLabel} />
      </div>
      <RouteTabs routes={routes} activeRoute={activeRoute} onRouteSelect={onRouteSelect} />
    </header>
  )
}
