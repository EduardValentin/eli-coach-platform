import type {
  ListLapsedCheckInsQuery,
  ListLapsedCheckInsUseCase,
} from "@eli-coach-platform/domain/check-in";
import type {
  NotificationDraft,
  NotificationExpirySource,
} from "@eli-coach-platform/domain/notification";

import { CheckInNotificationDrafts } from "~/features/check-ins/data/inbox/check-in-notification-drafts.server";

type CheckInExpiryNotificationsOptions = {
  listLapsedCheckIns: ListLapsedCheckInsUseCase;
};

type ExpiryQuery = Parameters<NotificationExpirySource["expiredFor"]>[0];

export class CheckInExpiryNotifications implements NotificationExpirySource {
  private readonly drafts = new CheckInNotificationDrafts();

  constructor(private readonly options: CheckInExpiryNotificationsOptions) {}

  async expiredFor(query: ExpiryQuery): Promise<NotificationDraft[]> {
    const lapsed = await this.options.listLapsedCheckIns.execute(
      this.lapsedQueryOf(query),
    );

    return lapsed.map((lapsedCheckIn) => this.drafts.lapseOf(lapsedCheckIn));
  }

  private lapsedQueryOf({
    recipient,
    since,
    at,
  }: ExpiryQuery): ListLapsedCheckInsQuery {
    return recipient.party === "coach"
      ? { party: "coach", clientId: null, since, at }
      : { party: "client", clientId: recipient.clientId, since, at };
  }
}
