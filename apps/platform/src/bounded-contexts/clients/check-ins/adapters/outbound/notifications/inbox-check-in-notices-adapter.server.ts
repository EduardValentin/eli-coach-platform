import type {
  CheckInClashesNotice,
  CheckInExpiryChange,
  CheckInInboxPort,
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesInboxNotice,
  CheckInSeriesNotification,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  NotificationDraft,
  NotificationInboxPort,
} from "~/bounded-contexts/clients/notifications/public";
import { CHECK_IN_PARTIES } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ClockPort } from "~/bounded-contexts/clients/check-ins/domain/clock-port";

import { CheckInNotificationDraftsAdapter } from "~/bounded-contexts/clients/check-ins/adapters/outbound/notifications/check-in-notification-drafts-adapter.server";

type InboxCheckInNoticesOptions = {
  clockPort: ClockPort;
  notificationInboxPort: Pick<
    NotificationInboxPort,
    "record" | "withdrawUnarrived"
  >;
};

export class InboxCheckInNoticesAdapter implements CheckInInboxPort {
  private readonly checkInNotificationDraftsAdapter =
    new CheckInNotificationDraftsAdapter();

  constructor(private readonly options: InboxCheckInNoticesOptions) {}

  checkInEvent(
    event: CheckInNotification,
    notice: CheckInNotice,
  ): Promise<void> {
    return this.recordNow((now) =>
      this.checkInNotificationDraftsAdapter.checkInEvent(event, notice, now),
    );
  }

  seriesEvent(
    event: CheckInSeriesNotification,
    notice: CheckInSeriesInboxNotice,
  ): Promise<void> {
    return this.recordNow((now) =>
      this.checkInNotificationDraftsAdapter.seriesEvent(event, notice, now),
    );
  }

  clashesAdded(notice: CheckInClashesNotice): Promise<void> {
    return this.recordNow((now) =>
      this.checkInNotificationDraftsAdapter.clashesAdded(notice, now),
    );
  }

  async scheduleExpiries({
    withdrawn,
    upcoming,
  }: CheckInExpiryChange): Promise<void> {
    const now = this.options.clockPort.now();
    const checkInIds = new Set([
      ...withdrawn,
      ...upcoming.map(({ checkIn }) => checkIn.id),
    ]);

    await this.options.notificationInboxPort.withdrawUnarrived({
      onceKeys: [...checkInIds].flatMap((checkInId) =>
        this.checkInNotificationDraftsAdapter.lapseKeysOf(checkInId),
      ),
      at: now,
    });

    const drafts = upcoming.flatMap((expiry) =>
      CHECK_IN_PARTIES.map((party) =>
        this.checkInNotificationDraftsAdapter.lapseOf({ ...expiry, party }),
      ),
    );

    if (drafts.length > 0) {
      await this.options.notificationInboxPort.record({ drafts, at: now });
    }
  }

  private async recordNow(
    draftAt: (now: Date) => NotificationDraft,
  ): Promise<void> {
    const now = this.options.clockPort.now();

    await this.options.notificationInboxPort.record({
      drafts: [draftAt(now)],
      at: now,
    });
  }
}
