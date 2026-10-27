import type {
  CheckInClashesNotice,
  CheckInInbox,
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesInboxNotice,
  CheckInSeriesNotification,
} from "@eli-coach-platform/domain/check-in";
import type {
  NotificationDraft,
  NotificationInbox,
} from "@eli-coach-platform/domain/notification";
import type { Clock } from "@eli-coach-platform/domain/shared";

import { CheckInNotificationDrafts } from "~/bounded-contexts/clients/check-ins/data/inbox/check-in-notification-drafts.server";

type InboxCheckInNoticesOptions = {
  clock: Clock;
  inbox: Pick<NotificationInbox, "record">;
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

  private async recordNow(
    draftAt: (now: Date) => NotificationDraft,
  ): Promise<void> {
    const now = this.options.clock.now();

    await this.options.inbox.record({ drafts: [draftAt(now)], at: now });
  }
}
