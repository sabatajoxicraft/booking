import type { Waitlist, WaitlistNotification } from '@/types/features'
import type { CustomerId } from '@/types/customer'

export class WaitlistService {
  private waitlists: Map<string, Waitlist> = new Map()
  private notifications: Map<string, WaitlistNotification> = new Map()
  private waitlistCounter = 0
  private notificationCounter = 0

  async addToWaitlist(
    customerId: CustomerId,
    serviceId: string,
    dateRangeStart: string,
    dateRangeEnd: string,
  ): Promise<Waitlist> {
    const id = `waitlist_${++this.waitlistCounter}`

    const existingWaitlists = Array.from(this.waitlists.values()).filter(
      (w) => w.serviceId === serviceId && w.dateRangeStart === dateRangeStart,
    )

    const waitlist: Waitlist = {
      id,
      customerId,
      serviceId,
      dateRangeStart,
      dateRangeEnd,
      position: existingWaitlists.length + 1,
      createdAt: new Date(),
    }

    this.waitlists.set(id, waitlist)
    await this.autoNotifyOnAddition(waitlist)
    return waitlist
  }

  async notifyWaitlistOnAvailability(serviceId: string, date: string): Promise<void> {
    const waitlistsForService = Array.from(this.waitlists.values()).filter(
      (w) => w.serviceId === serviceId && w.dateRangeStart <= date && date <= w.dateRangeEnd,
    )

    for (const waitlist of waitlistsForService) {
      const notification: WaitlistNotification = {
        id: `notif_${++this.notificationCounter}`,
        waitlistId: waitlist.id,
        channel: 'email',
        status: 'sent',
        sentAt: new Date(),
      }

      this.notifications.set(notification.id, notification)
      waitlist.notifiedAt = new Date()

      this.removeFromWaitlist(waitlist.id)
    }
  }

  getWaitlistPosition(customerId: CustomerId, serviceId: string): number {
    const waitlist = Array.from(this.waitlists.values()).find(
      (w) => w.customerId === customerId && w.serviceId === serviceId,
    )

    return waitlist ? waitlist.position : -1
  }

  getWaitlist(waitlistId: string): Waitlist | undefined {
    return this.waitlists.get(waitlistId)
  }

  getWaitlistsByCustomer(customerId: CustomerId): Waitlist[] {
    return Array.from(this.waitlists.values()).filter((w) => w.customerId === customerId)
  }

  getWaitlistsByService(serviceId: string): Waitlist[] {
    return Array.from(this.waitlists.values()).filter((w) => w.serviceId === serviceId)
  }

  removeFromWaitlist(waitlistId: string): boolean {
    return this.waitlists.delete(waitlistId)
  }

  private async autoNotifyOnAddition(waitlist: Waitlist): Promise<void> {
    const notification: WaitlistNotification = {
      id: `notif_${++this.notificationCounter}`,
      waitlistId: waitlist.id,
      channel: 'email',
      status: 'sent',
      sentAt: new Date(),
    }

    this.notifications.set(notification.id, notification)
  }
}
