import type {
  CheckInClashesNotice,
  CheckInExpiryChange,
  CheckInInbox,
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesInboxNotice,
  CheckInSeriesNotification,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  NotificationDraft,
  NotificationInbox,
} from "~/bounded-contexts/clients/notifications/public";
import { CHECK_IN_PARTIES } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { Clock } from "~/bounded-contexts/clients/check-ins/domain/clock";

import { CheckInNotificationDrafts } from "~/bounded-contexts/clients/check-ins/adapters/outbound/notifications/check-in-notification-drafts.server";

type InboxCheckInNoticesOptions = {
  clock: Clock;
  inbox: Pick<NotificationInbox, "record" | "withdrawUnarrived">;
};

export class InboxCheckInNotices implements CheckInInbox {
  private readonly drafts = new CheckInNotificationDrafts();

  constructor(private readonly options: InboxCheckInNoticesOptions) {}

  checkInEvent(
    event: CheckInNotification,
    notice: CheckInNotice,
  ): Promise<void> {
    return this.recordNow((now) =>
      this.drafts.checkInEvent(event, notice, now),
    );
  }

  seriesEvent(
    event: CheckInSeriesNotification,
    notice: CheckInSeriesInboxNotice,
  ): Promise<void> {
    return this.recordNow((now) => this.drafts.seriesEvent(event, notice, now));
  }

  clashesAdded(notice: CheckInClashesNotice): Promise<void> {
    return this.recordNow((now) => this.drafts.clashesAdded(notice, now));
  }

  async scheduleExpiries({
    withdrawn,
    upcoming,
  }: CheckInExpiryChange): Promise<void> {
    const now = this.options.clock.now();
    const checkInIds = new Set([
      ...withdrawn,
      ...upcoming.map(({ checkIn }) => checkIn.id),
    ]);

    await this.options.inbox.withdrawUnarrived({
      onceKeys: [...checkInIds].flatMap((checkInId) =>
        this.drafts.lapseKeysOf(checkInId),
      ),
      at: now,
    });

    const drafts = upcoming.flatMap((expiry) =>
      CHECK_IN_PARTIES.map((party) =>
        this.drafts.lapseOf({ ...expiry, party }),
      ),
    );

    if (drafts.length > 0) {
      await this.options.inbox.record({ drafts, at: now });
    }
  }

  private async recordNow(
    draftAt: (now: Date) => NotificationDraft,
  ): Promise<void> {
    const now = this.options.clock.now();

    await this.options.inbox.record({ drafts: [draftAt(now)], at: now });
  }
}
