import type { ClientIdentities } from "../client";

import type { CheckIn } from "./check-in";
import type { CheckInParty } from "./check-in-party";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckInSeries } from "./check-in-series";
import type {
  CheckInDelivery,
  CheckInNotice,
  CheckInNotification,
  CheckInNotifications,
  CheckInSeriesNotification,
} from "./check-in-notifications";

type CheckInAnnouncerOptions = {
  identities: Pick<ClientIdentities, "findByClientIds">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

type AnnouncedClient = CheckInNotice["client"];

type AnnouncedSeries = {
  series: CheckInSeries;
  weekStartsAt: Date;
  clientTimeZone: string;
};

export class CheckInAnnouncer {
  constructor(private readonly options: CheckInAnnouncerOptions) {}

  async announce(
    notification: CheckInNotification,
    checkIn: CheckIn,
    actedBy: CheckInParty,
  ): Promise<void> {
    const delivery = await this.deliverTo(checkIn.clientId, (client) =>
      this.options.notifications[notification]({
        checkIn: checkIn.toSnapshot(),
        client,
        recipient: this.recipientWhenActing(actedBy),
      }),
    );

    if (delivery !== "sent") {
      this.options.incidents.checkInNotificationFailed({
        checkInId: checkIn.id,
        notification,
      });
    }
  }

  async announceSeries(
    notification: CheckInSeriesNotification,
    announced: AnnouncedSeries,
  ): Promise<void> {
    const { series } = announced;
    const delivery = await this.deliverTo(series.clientId, (client) =>
      this.options.notifications[notification]({
        series: series.toSnapshot(),
        weekStartsAt: announced.weekStartsAt,
        clientTimeZone: announced.clientTimeZone,
        client,
        recipient: "client",
      }),
    );

    if (delivery !== "sent") {
      this.options.incidents.checkInSeriesNotificationFailed({
        seriesId: series.id,
        notification,
      });
    }
  }

  private async deliverTo(
    clientId: string,
    send: (client: AnnouncedClient) => Promise<CheckInDelivery>,
  ): Promise<CheckInDelivery> {
    try {
      const [client] = await this.options.identities.findByClientIds([
        clientId,
      ]);

      if (!client) {
        return "failed";
      }

      return await send(client);
    } catch {
      return "failed";
    }
  }

  private recipientWhenActing(actedBy: CheckInParty): CheckInParty {
    return actedBy === "coach" ? "client" : "coach";
  }
}
