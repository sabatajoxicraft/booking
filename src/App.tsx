import { Suspense, lazy, type ReactNode, useMemo, useState } from 'react'

import { AppShellTemplate } from '@/components/templates/app-shell-template'
import { createMockServiceRegistry } from '@/services/mock-services'
import type { AvailabilitySlotId } from '@/types/availability-slot'
import type { BookingIntent } from '@/types/booking'
import type { BusinessId } from '@/types/business'
import type { CustomerId } from '@/types/customer'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

type RouteKey = 'catalog' | 'availability' | 'bookings' | 'provider' | 'customer'

const CatalogPage = lazy(async () => {
  const module = await import('@/pages/catalog-page')
  return { default: module.CatalogPage }
})

const AvailabilityPage = lazy(async () => {
  const module = await import('@/pages/availability-page')
  return { default: module.AvailabilityPage }
})

const BookingsPage = lazy(async () => {
  const module = await import('@/pages/bookings-page')
  return { default: module.BookingsPage }
})

const ProviderOpsPage = lazy(async () => {
  const module = await import('@/pages/provider-ops-page')
  return { default: module.ProviderOpsPage }
})

const CustomerJourneyPage = lazy(async () => {
  const module = await import('@/pages/customer-journey-page')
  return { default: module.CustomerJourneyPage }
})

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
    { key: 'catalog', label: 'Catalog' },
    { key: 'availability', label: 'Availability' },
    { key: 'bookings', label: 'Bookings' },
    { key: 'provider', label: 'Admin' },
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
        paymentService={services.payments}
        notificationService={services.notifications}
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
        statusLabel="M2 planning"
        routes={routes}
        activeRoute={activeRoute}
        onRouteSelect={setActiveRoute}
      >
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading route...</p>}>
          {pageByRoute[activeRoute]}
        </Suspense>
      </AppShellTemplate>
    </div>
  )
}

export default App
