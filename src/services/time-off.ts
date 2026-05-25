import type { ProviderTimeOff } from '@/types/features'

export class TimeOffService {
  private timeOffRecords: Map<string, ProviderTimeOff> = new Map()
  private counter = 0

  async scheduleTimeOff(
    providerId: string,
    startDate: string,
    endDate: string,
    reason: string,
  ): Promise<ProviderTimeOff> {
    const id = `timeoff_${++this.counter}`

    const timeOff: ProviderTimeOff = {
      id,
      providerId,
      startDate,
      endDate,
      reason,
      createdAt: new Date(),
    }

    this.timeOffRecords.set(id, timeOff)
    return timeOff
  }

  async findRescheduleOptions(_bookingId: string, availableProviders: string[]): Promise<string[]> {
    return availableProviders.filter((providerId) => !this.isProviderOffDuringPeriod(providerId))
  }

  async autoRescheduleOnTimeOff(providerId: string): Promise<Map<string, string[]>> {
    const rescheduleMap = new Map<string, string[]>()

    const timeOffs = Array.from(this.timeOffRecords.values()).filter((t) => t.providerId === providerId)

    for (const timeOff of timeOffs) {
      rescheduleMap.set(timeOff.id, this.findAlternativeSlots(timeOff.startDate, timeOff.endDate))
    }

    return rescheduleMap
  }

  getTimeOffRecords(providerId: string): ProviderTimeOff[] {
    return Array.from(this.timeOffRecords.values()).filter((t) => t.providerId === providerId)
  }

  getTimeOffRecord(timeOffId: string): ProviderTimeOff | undefined {
    return this.timeOffRecords.get(timeOffId)
  }

  cancelTimeOff(timeOffId: string): boolean {
    return this.timeOffRecords.delete(timeOffId)
  }

  private isProviderOffDuringPeriod(providerId: string, startDate?: string, endDate?: string): boolean {
    const timeOffs = Array.from(this.timeOffRecords.values()).filter((t) => t.providerId === providerId)

    if (!startDate || !endDate) {
      return timeOffs.length > 0
    }

    return timeOffs.some((t) => {
      const tStart = new Date(t.startDate).getTime()
      const tEnd = new Date(t.endDate).getTime()
      const sDate = new Date(startDate).getTime()
      const eDate = new Date(endDate).getTime()
      return tStart <= eDate && tEnd >= sDate
    })
  }

  private findAlternativeSlots(startDate: string, endDate: string): string[] {
    return [
      `alt_slot_1_${new Date(startDate).getTime()}`,
      `alt_slot_2_${new Date(endDate).getTime()}`,
    ]
  }
}
