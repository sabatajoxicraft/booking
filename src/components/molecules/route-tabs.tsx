import { Button } from '@/components/ui/button'

interface RouteTabsProps<TRouteKey extends string> {
  routes: Array<{
    key: TRouteKey
    label: string
  }>
  activeRoute: TRouteKey
  onRouteSelect: (routeKey: TRouteKey) => void
}

export function RouteTabs<TRouteKey extends string>({
  routes,
  activeRoute,
  onRouteSelect,
}: RouteTabsProps<TRouteKey>) {
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Slice navigation">
      {routes.map((route) => (
        <Button
          key={route.key}
          type="button"
          size="sm"
          variant={route.key === activeRoute ? 'default' : 'outline'}
          onClick={() => onRouteSelect(route.key)}
        >
          {route.label}
        </Button>
      ))}
    </nav>
  )
}
