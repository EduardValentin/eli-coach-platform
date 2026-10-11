import type { CheckIn, CheckInParty } from "./check-in";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type {
  CheckInDelivery,
  CheckInNotification,
  CheckInNotifications,
} from "./check-in-notifications";

type CheckInAnnouncerOptions = {
  clients: Pick<CheckInClients, "identitiesOf">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

export class CheckInAnnouncer {
  constructor(private readonly options: CheckInAnnouncerOptions) {}

  async announce(
    notification: CheckInNotification,
    checkIn: CheckIn,
    actedBy: CheckInParty,
  ): Promise<void> {
    const delivery = await this.deliver(notification, checkIn, actedBy);

    if (delivery !== "sent") {
      this.options.incidents.checkInNotificationFailed({
        checkInId: checkIn.id,
        notification,
      });
    }
  }

  private async deliver(
    notification: CheckInNotification,
    checkIn: CheckIn,
    actedBy: CheckInParty,
  ): Promise<CheckInDelivery> {
    try {
      const [client] = await this.options.clients.identitiesOf([
        checkIn.clientId,
      ]);

      if (!client) {
        return "failed";
      }

      return await this.options.notifications[notification]({
        checkIn: checkIn.toSnapshot(),
        client,
        recipient: this.recipientWhenActing(actedBy),
      });
    } catch {
      return "failed";
    }
  }

  private recipientWhenActing(actedBy: CheckInParty): CheckInParty {
    return actedBy === "coach" ? "client" : "coach";
  }
}
