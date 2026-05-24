import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { AvailabilityQueryService } from '@/services/interfaces'
import type { ApiErrorContract } from '@/types/api'
import type { AvailabilitySlot, AvailabilitySlotId } from '@/types/availability-slot'
import type { BusinessId } from '@/types/business'
import type { ServiceId } from '@/types/service'
import type { StaffId } from '@/types/staff'

type AvailabilityLoadState =
  | { status: 'idle'; message: string }
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorContract }
  | { status: 'success'; slots: AvailabilitySlot[] }

interface AvailabilityPageProps {
  availabilityService: AvailabilityQueryService
  businessId: BusinessId
  selectedServiceId: ServiceId | null
  selectedStaffId: StaffId | null
  dateIso: string
  selectedSlotId: AvailabilitySlotId | null
  onDateChange: (dateIso: string) => void
  onSlotSelect: (slotId: AvailabilitySlotId) => void
}

export function AvailabilityPage({
  availabilityService,
  businessId,
  selectedServiceId,
  selectedStaffId,
  dateIso,
  selectedSlotId,
  onDateChange,
  onSlotSelect,
}: AvailabilityPageProps) {
  const idleMessage = 'Choose a service and staff member to see available times.'
  const [state, setState] = useState<AvailabilityLoadState>({
    status: 'idle',
    message: idleMessage,
  })

  useEffect(() => {
    if (!selectedServiceId || !selectedStaffId) {
      return
    }

    const loadAvailability = async () => {
      setState({ status: 'loading' })
      const response = await availabilityService.findAvailability({
        businessId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        dateIso,
      })

      if (response.status === 'failure') {
        setState({ status: 'error', error: response.error })
        return
      }

      setState({ status: 'success', slots: response.data })
    }

    void loadAvailability()
  }, [availabilityService, businessId, selectedServiceId, selectedStaffId, dateIso])

  const uiState: AvailabilityLoadState =
    !selectedServiceId || !selectedStaffId ? { status: 'idle', message: idleMessage } : state

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">Choose a Service</h2>
      <label className="flex max-w-xs flex-col gap-1 text-sm">
        Date
        <input
          type="date"
          value={dateIso}
          onChange={(event) => onDateChange(event.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-sm"
        />
      </label>
      {uiState.status === 'idle' && <p className="text-sm text-muted-foreground">{uiState.message}</p>}
      {uiState.status === 'loading' && (
        <p className="text-sm text-muted-foreground">Finding available times...</p>
      )}
      {uiState.status === 'error' && (
        <p className="text-sm text-destructive">
          Availability error ({uiState.error.code}): {uiState.error.message}
        </p>
      )}
      {uiState.status === 'success' && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Available slots</h3>
          {uiState.slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No times available for this selection. Try another date or staff member.</p>
          ) : (
            <ul className="space-y-2">
              {uiState.slots.map((slot) => (
                <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <p className="text-sm text-muted-foreground">
                    {new Date(slot.startIso).toLocaleString()} → {new Date(slot.endIso).toLocaleTimeString()}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant={slot.id === selectedSlotId ? 'default' : 'outline'}
                    onClick={() => onSlotSelect(slot.id)}
                    disabled={!slot.isBookable}
                  >
                    {slot.id === selectedSlotId ? 'Selected' : 'Pick This Time'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
