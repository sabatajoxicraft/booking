import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { filterItemsByQuery, isServiceSearchEmpty } from '@/lib/service-search'
import type { CatalogDiscoveryService } from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { BusinessId, BusinessSummary } from '@/types/business'
import type { ServiceDefinition, ServiceId } from '@/types/service'
import type { StaffId, StaffProfile } from '@/types/staff'

type CatalogLoadState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | {
      status: 'success'
      businesses: BusinessSummary[]
      services: ServiceDefinition[]
      staff: StaffProfile[]
    }

interface CatalogPageProps {
  catalogService: CatalogDiscoveryService
  selectedBusinessId: BusinessId
  selectedServiceId: ServiceId | null
  selectedStaffId: StaffId | null
  onBusinessSelect: (businessId: BusinessId) => void
  onServiceSelect: (serviceId: ServiceId) => void
  onStaffSelect: (staffId: StaffId) => void
}

export function CatalogPage({
  catalogService,
  selectedBusinessId,
  selectedServiceId,
  selectedStaffId,
  onBusinessSelect,
  onServiceSelect,
  onStaffSelect,
}: CatalogPageProps) {
  const [state, setState] = useState<CatalogLoadState>({ status: 'loading' })
  const [serviceQuery, setServiceQuery] = useState('')

  useEffect(() => {
    const loadCatalog = async () => {
      setState({ status: 'loading' })

      const businessesResponse = await catalogService.listBusinesses()
      if (businessesResponse.status === 'failure') {
        setState({ status: 'error', error: businessesResponse.error })
        return
      }

      const servicesResponse = await catalogService.listServicesByBusiness(selectedBusinessId)
      if (servicesResponse.status === 'failure') {
        setState({ status: 'error', error: servicesResponse.error })
        return
      }

      const staffResponse = await catalogService.listStaffByBusiness(selectedBusinessId)
      if (staffResponse.status === 'failure') {
        setState({ status: 'error', error: staffResponse.error })
        return
      }

      setState({
        status: 'success',
        businesses: businessesResponse.data,
        services: servicesResponse.data,
        staff: staffResponse.data,
      })
    }

    void loadCatalog()
  }, [catalogService, selectedBusinessId])

  const filteredServices =
    state.status === 'success'
      ? filterItemsByQuery(state.services, serviceQuery, (service) =>
          [
            service.name,
            service.id,
            `${service.durationMinutes} minutes`,
            `${service.durationMinutes}m`,
            `${service.currency} ${(service.priceCents / 100).toFixed(2)}`,
          ].join(' '),
        )
      : []
  const hasServiceSearch = !isServiceSearchEmpty(serviceQuery)

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-medium">Browse Services</h2>
      {state.status === 'loading' && (
        <p className="text-sm text-muted-foreground">Loading businesses, services, and staff...</p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-destructive">
          We're having trouble loading services. Please refresh the page.
        </p>
      )}
      {state.status === 'success' && (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Businesses</h3>
            <div className="flex flex-wrap gap-2">
              {state.businesses.map((business) => (
                <Button
                  key={business.id}
                  type="button"
                  size="sm"
                  variant={business.id === selectedBusinessId ? 'default' : 'outline'}
                  onClick={() => onBusinessSelect(business.id)}
                >
                  {business.name}
                </Button>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Services</h3>
            <label className="flex max-w-sm flex-col gap-1 text-sm">
              Search services
              <div className="flex gap-2">
                <input
                  type="search"
                  value={serviceQuery}
                  onChange={(event) => setServiceQuery(event.target.value)}
                  placeholder="Search by service name, duration, or price"
                  className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                />
                {hasServiceSearch && (
                  <Button type="button" size="sm" variant="outline" onClick={() => setServiceQuery('')}>
                    Clear
                  </Button>
                )}
              </div>
            </label>
            {state.services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services available. Please contact support.</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No services match "{serviceQuery.trim()}". Try a shorter search or choose another business.
              </p>
            ) : (
              <ul className="space-y-2">
                {filteredServices.map((service) => (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.durationMinutes} min · {service.currency} {(service.priceCents / 100).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={service.id === selectedServiceId ? 'default' : 'outline'}
                      onClick={() => onServiceSelect(service.id)}
                    >
                      {service.id === selectedServiceId ? 'Selected' : 'Select'}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {hasServiceSearch && filteredServices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Showing {filteredServices.length} of {state.services.length} services.
              </p>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Choose Your Staff Member</h3>
            <div className="flex flex-wrap gap-2">
              {state.staff.map((staffMember) => (
                <Button
                  key={staffMember.id}
                  type="button"
                  size="sm"
                  variant={staffMember.id === selectedStaffId ? 'default' : 'outline'}
                  onClick={() => onStaffSelect(staffMember.id)}
                  disabled={selectedServiceId !== null && !staffMember.serviceIds.includes(selectedServiceId)}
                >
                  {staffMember.displayName}
                </Button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
