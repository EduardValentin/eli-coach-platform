import type {
  CheckInClashesNotice,
  CheckInLapseKind,
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesInboxNotice,
  CheckInSeriesNotification,
  LapsedCheckIn,
} from "@eli-coach-platform/domain/check-in";
import type {
  NotificationDraft,
  NotificationFacts,
  NotificationRecipientSnapshot,
} from "@eli-coach-platform/domain/notification";

import {
  CHECK_IN_BELL_FACTS,
  CHECK_IN_BELL_KINDS,
  type CheckInBellKind,
} from "~/features/check-ins/public/check-in-bell";

const LAPSE_KINDS: Record<CheckInLapseKind, CheckInBellKind> = {
  request_expired: CHECK_IN_BELL_KINDS.requestExpired,
  new_time_expired: CHECK_IN_BELL_KINDS.newTimeExpired,
  clash_missed: CHECK_IN_BELL_KINDS.clashMissed,
};

export class CheckInNotificationDrafts {
  checkInEvent(
    event: CheckInNotification,
    notice: CheckInNotice,
    arrivedAt: Date,
  ): NotificationDraft {
    return this.draftOf({
      kind: CHECK_IN_BELL_KINDS[event],
      recipient: this.recipientOf(notice),
      facts: this.momentFactsOf(notice),
      arrivedAt,
      onceKey: null,
    });
  }

  seriesEvent(
    event: CheckInSeriesNotification,
    notice: CheckInSeriesInboxNotice,
    arrivedAt: Date,
  ): NotificationDraft {
    return this.draftOf({
      kind: CHECK_IN_BELL_KINDS[event],
      recipient: { party: "client", clientId: notice.client.clientId },
      facts:
        event === "seriesStopped"
          ? {}
          : {
              ...(notice.firstWeekId && { firstWeekId: notice.firstWeekId }),
              firstWeekStartsAt: notice.weekStartsAt.toISOString(),
            },
      arrivedAt,
      onceKey: null,
    });
  }

  clashesAdded(
    notice: CheckInClashesNotice,
    arrivedAt: Date,
  ): NotificationDraft {
    return this.draftOf({
      kind: CHECK_IN_BELL_KINDS.seriesClashes,
      recipient: { party: "coach" },
      facts: {
        clientName: this.fullNameOf(notice.client),
        clashes: notice.clashes,
        earliestId: notice.earliest.id,
        earliestStartsAt: notice.earliest.startsAt.toISOString(),
      },
      arrivedAt,
      onceKey: null,
    });
  }

  lapsed(lapsed: LapsedCheckIn): NotificationDraft {
    const notice: CheckInNotice = {
      checkIn: lapsed.checkIn,
      client: lapsed.client,
      recipient: lapsed.party,
    };

    return this.draftOf({
      kind: LAPSE_KINDS[lapsed.lapse],
      recipient: this.recipientOf(notice),
      facts: this.momentFactsOf(notice),
      arrivedAt: lapsed.lapsedAt,
      onceKey: `check-in:${lapsed.checkIn.id}:${lapsed.lapse}:${lapsed.party}`,
    });
  }

  private draftOf(
    draft: NotificationDraft & { kind: CheckInBellKind },
  ): NotificationDraft {
    CHECK_IN_BELL_FACTS[draft.kind].parse(draft.facts);

    return draft;
  }

  private recipientOf(notice: CheckInNotice): NotificationRecipientSnapshot {
    return notice.recipient === "coach"
      ? { party: "coach" }
      : { party: "client", clientId: notice.client.clientId };
  }

  private momentFactsOf(notice: CheckInNotice): NotificationFacts {
    return {
      checkInId: notice.checkIn.id,
      startsAt: notice.checkIn.startsAt.toISOString(),
      ...(notice.recipient === "coach" && {
        clientName: this.fullNameOf(notice.client),
      }),
    };
  }

  private fullNameOf(client: CheckInNotice["client"]): string {
    return `${client.firstName} ${client.lastName}`;
  }
}
