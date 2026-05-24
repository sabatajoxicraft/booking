import { type ReactNode, useMemo, useState } from 'react'

import { AppShellTemplate } from '@/components/templates/app-shell-template'
import { AvailabilityPage } from '@/pages/availability-page'
import { BookingsPage } from '@/pages/bookings-page'
import { CatalogPage } from '@/pages/catalog-page'
import { CustomerJourneyPage } from '@/pages/customer-journey-page'
import { ProviderOpsPage } from '@/pages/provider-ops-page'
import { createMockServiceRegistry } from '@/services/mock-services'
import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { BookingIntent } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

type RouteKey = 'catalog' | 'availability' | 'bookings' | 'provider' | 'customer'

function App() {
  const [activeRoute, setActiveRoute] = useState<RouteKey>('customer')
  const [selectedBusinessId, setSelectedBusinessId] = useState<BusinessId>('biz_main')
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceId | null>('svc_consult')
  const [selectedStaffId, setSelectedStaffId] = useState<StaffId | null>('stf_amy')
  const [selectedDateIso, setSelectedDateIso] = useState('2026-01-20')
  const [selectedSlotId, setSelectedSlotId] = useState<AvailabilitySlotId | null>('slot_001')
  const [createdIntents, setCreatedIntents] = useState<BookingIntent[]>([])

  const services = useMemo(() => createMockServiceRegistry(), [])
  const customerId: CustomerId = 'cus_demo'

  const routes: Array<{ key: RouteKey; label: string }> = [
    { key: 'customer', label: 'Customer' },
  ]

  const handleIntentCreated = (intent: BookingIntent) => {
    setCreatedIntents((current) => {
      if (current.some((existingIntent) => existingIntent.intentId === intent.intentId)) {
        return current
      }
      return [intent, ...current]
    })
  }

  const pageByRoute: Record<RouteKey, ReactNode> = {
    catalog: (
      <CatalogPage
        catalogService={services.catalog}
        selectedBusinessId={selectedBusinessId}
        selectedServiceId={selectedServiceId}
        selectedStaffId={selectedStaffId}
        onBusinessSelect={(businessId) => {
          setSelectedBusinessId(businessId)
          setSelectedServiceId(null)
          setSelectedStaffId(null)
          setSelectedSlotId(null)
        }}
        onServiceSelect={(serviceId) => {
          setSelectedServiceId(serviceId)
          setSelectedSlotId(null)
        }}
        onStaffSelect={(staffId) => {
          setSelectedStaffId(staffId)
          setSelectedSlotId(null)
        }}
      />
    ),
    availability: (
      <AvailabilityPage
        availabilityService={services.availability}
        businessId={selectedBusinessId}
        selectedServiceId={selectedServiceId}
        selectedStaffId={selectedStaffId}
        dateIso={selectedDateIso}
        selectedSlotId={selectedSlotId}
        onDateChange={setSelectedDateIso}
        onSlotSelect={setSelectedSlotId}
      />
    ),
    bookings: (
      <BookingsPage
        bookingService={services.bookings}
        businessId={selectedBusinessId}
        selectedServiceId={selectedServiceId}
        selectedSlotId={selectedSlotId}
        customerId={customerId}
        intents={createdIntents}
        onIntentCreated={handleIntentCreated}
      />
    ),
    provider: <ProviderOpsPage providerService={services.providerOps} businessId={selectedBusinessId} />,
    customer: (
      <CustomerJourneyPage
        catalogService={services.catalog}
        availabilityService={services.availability}
        bookingService={services.bookings}
        providerService={services.providerOps}
        selectedBusinessId={selectedBusinessId}
        selectedServiceId={selectedServiceId}
        selectedStaffId={selectedStaffId}
        selectedDateIso={selectedDateIso}
        selectedSlotId={selectedSlotId}
        customerId={customerId}
        onBusinessSelect={(businessId) => {
          setSelectedBusinessId(businessId)
          setSelectedServiceId(null)
          setSelectedStaffId(null)
          setSelectedSlotId(null)
        }}
        onServiceSelect={(serviceId) => {
          setSelectedServiceId(serviceId)
          setSelectedSlotId(null)
        }}
        onStaffSelect={(staffId) => {
          setSelectedStaffId(staffId)
          setSelectedSlotId(null)
        }}
        onDateChange={setSelectedDateIso}
        onSlotSelect={setSelectedSlotId}
        onIntentCreated={handleIntentCreated}
      />
    ),
  }

  return (
    <div className="min-h-svh bg-background">
      <AppShellTemplate
        title="Booking System"
        subtitle="Complete your appointment in minutes"
        statusLabel="Booking System"
        routes={routes}
        activeRoute={activeRoute}
        onRouteSelect={setActiveRoute}
      >
        {pageByRoute[activeRoute]}
      </AppShellTemplate>
    </div>
  )
}

export default App
