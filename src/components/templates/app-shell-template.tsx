import type { ReactNode } from 'react'

import { AppShellHeader } from '@/components/organisms/app-shell-header'

interface AppShellTemplateProps<TRouteKey extends string> {
  title: string
  subtitle: string
  statusLabel: string
  routes: Array<{
    key: TRouteKey
    label: string
  }>
  activeRoute: TRouteKey
  onRouteSelect: (routeKey: TRouteKey) => void
  children: ReactNode
}

export function AppShellTemplate<TRouteKey extends string>({
  title,
  subtitle,
  statusLabel,
  routes,
  activeRoute,
  onRouteSelect,
  children,
}: AppShellTemplateProps<TRouteKey>) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-5 p-6 text-foreground">
      <AppShellHeader
        title={title}
        subtitle={subtitle}
        statusLabel={statusLabel}
        routes={routes}
        activeRoute={activeRoute}
        onRouteSelect={onRouteSelect}
      />
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm">{children}</section>
    </main>
  )
}
