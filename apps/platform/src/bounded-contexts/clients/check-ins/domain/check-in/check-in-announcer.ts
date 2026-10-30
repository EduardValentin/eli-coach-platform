import type { ClientIdentitiesPort } from "./client-identities-port";

import type { ClockPort } from "../clock-port";

import { CheckIn } from "./check-in";
import type { CheckInExpiry, CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInParty } from "./check-in-party";
import type { CheckInSeries } from "./check-in-series";
import type {
  CheckInDelivery,
  CheckInNotice,
  CheckInNotification,
  CheckInNotificationsPort,
  CheckInSeriesNotification,
} from "./check-in-notifications-port";

type CheckInAnnouncerOptions = {
  clockPort: ClockPort;
  clientIdentitiesPort: Pick<ClientIdentitiesPort, "findByClientIds">;
  checkInInboxPort: CheckInInboxPort;
  checkInIncidentsPort: CheckInIncidentsPort;
  checkInNotificationsPort: CheckInNotificationsPort;
};

type AnnouncedClient = CheckInNotice["client"];

type AnnouncedSeries = {
  series: CheckInSeries;
  weekStartsAt: Date;
  clientTimeZone: string;
  firstWeekId: string | null;
};

type ExpiryChange = {
  current: readonly CheckIn[];
  withdrawn: readonly string[];
  reportFailure: () => void;
};

type AnnouncementChannel = {
  deliver: (client: AnnouncedClient) => Promise<CheckInDelivery>;
  reportFailure: () => void;
};

export class CheckInAnnouncer {
  constructor(private readonly options: CheckInAnnouncerOptions) {}

  async announce(
    notification: CheckInNotification,
    checkIn: CheckIn,
    actedBy: CheckInParty,
  ): Promise<void> {
    const checkInId = checkIn.id;
    const noticeFor = (client: AnnouncedClient): CheckInNotice => ({
      checkIn: checkIn.toSnapshot(),
      client,
      recipient: this.recipientWhenActing(actedBy),
    });

    const reportInboxFailure = () =>
      this.options.checkInIncidentsPort.checkInInboxFailed({
        checkInId,
        event: notification,
      });
    const client = await this.deliverTo(checkIn.clientId, [
      {
        deliver: (client) =>
          this.options.checkInNotificationsPort[notification](
            noticeFor(client),
          ),
        reportFailure: () =>
          this.options.checkInIncidentsPort.checkInNotificationFailed({
            checkInId,
            notification,
          }),
      },
      {
        deliver: (client) =>
          this.sentOnceRecorded(
            this.options.checkInInboxPort.checkInEvent(
              notification,
              noticeFor(client),
            ),
          ),
        reportFailure: reportInboxFailure,
      },
    ]);

    await this.scheduleExpiries(client, {
      current: [checkIn],
      withdrawn: [],
      reportFailure: reportInboxFailure,
    });
  }

  async announceExpiries(
    series: CheckInSeries,
    change: { current: readonly CheckIn[]; withdrawn: readonly string[] },
  ): Promise<void> {
    const now = this.options.clockPort.now();
    const lapsing = change.current.some((checkIn) =>
      checkIn.upcomingLapseAfter(now),
    );
    const client = lapsing ? await this.identityOf(series.clientId) : null;

    await this.scheduleExpiries(client, {
      ...change,
      reportFailure: () =>
        this.options.checkInIncidentsPort.checkInSeriesInboxFailed({
          seriesId: series.id,
          event: "clashesAdded",
        }),
    });
  }

  async announceSeries(
    notification: CheckInSeriesNotification,
    announced: AnnouncedSeries,
  ): Promise<void> {
    const { series, firstWeekId } = announced;
    const noticeFor = (client: AnnouncedClient) => ({
      series: series.toSnapshot(),
      weekStartsAt: announced.weekStartsAt,
      clientTimeZone: announced.clientTimeZone,
      client,
      recipient: "client" as const,
    });

    await this.deliverTo(series.clientId, [
      {
        deliver: (client) =>
          this.options.checkInNotificationsPort[notification](
            noticeFor(client),
          ),
        reportFailure: () =>
          this.options.checkInIncidentsPort.checkInSeriesNotificationFailed({
            seriesId: series.id,
            notification,
          }),
      },
      {
        deliver: (client) =>
          this.sentOnceRecorded(
            this.options.checkInInboxPort.seriesEvent(notification, {
              ...noticeFor(client),
              firstWeekId,
            }),
          ),
        reportFailure: () =>
          this.options.checkInIncidentsPort.checkInSeriesInboxFailed({
            seriesId: series.id,
            event: notification,
          }),
      },
    ]);
  }

  async announceClashes(
    series: CheckInSeries,
    clashes: readonly CheckIn[],
  ): Promise<void> {
    const earliest = CheckIn.earliestOf(clashes);

    if (!earliest) {
      return;
    }

    await this.deliverTo(series.clientId, [
      {
        deliver: (client) =>
          this.sentOnceRecorded(
            this.options.checkInInboxPort.clashesAdded({
              series: series.toSnapshot(),
              client,
              clashes: clashes.length,
              earliest: { id: earliest.id, startsAt: earliest.startsAt },
            }),
          ),
        reportFailure: () =>
          this.options.checkInIncidentsPort.checkInSeriesInboxFailed({
            seriesId: series.id,
            event: "clashesAdded",
          }),
      },
    ]);
  }

  private async deliverTo(
    clientId: string,
    channels: readonly AnnouncementChannel[],
  ): Promise<AnnouncedClient | null> {
    const client = await this.identityOf(clientId);

    await Promise.all(
      channels.map((channel) => this.deliverThrough(channel, client)),
    );

    return client;
  }

  private async scheduleExpiries(
    client: AnnouncedClient | null,
    change: ExpiryChange,
  ): Promise<void> {
    const now = this.options.clockPort.now();
    const upcoming = client
      ? change.current.flatMap((checkIn): CheckInExpiry[] => {
          const lapse = checkIn.upcomingLapseAfter(now);

          return lapse
            ? [
                {
                  checkIn: checkIn.toSnapshot(),
                  lapse: lapse.toSnapshot(),
                  client,
                },
              ]
            : [];
        })
      : [];
    const withdrawn = [
      ...change.withdrawn,
      ...change.current.map((checkIn) => checkIn.id),
    ];

    try {
      await this.options.checkInInboxPort.scheduleExpiries({
        withdrawn,
        upcoming,
      });
    } catch {
      change.reportFailure();
    }
  }

  private async deliverThrough(
    channel: AnnouncementChannel,
    client: AnnouncedClient | null,
  ): Promise<void> {
    const delivery = client
      ? await channel.deliver(client).catch((): CheckInDelivery => "failed")
      : "failed";

    if (delivery !== "sent") {
      channel.reportFailure();
    }
  }

  private async identityOf(clientId: string): Promise<AnnouncedClient | null> {
    try {
      const [client] = await this.options.clientIdentitiesPort.findByClientIds([
        clientId,
      ]);

      return client ?? null;
    } catch {
      return null;
    }
  }

  private async sentOnceRecorded(
    recording: Promise<void>,
  ): Promise<CheckInDelivery> {
    await recording;

    return "sent";
  }

  private recipientWhenActing(actedBy: CheckInParty): CheckInParty {
    return actedBy === "coach" ? "client" : "coach";
  }
}
