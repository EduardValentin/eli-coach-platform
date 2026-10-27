import type {
  CheckInClashesNotice,
  CheckInExpiry,
  CheckInLapseKind,
  CheckInNotice,
  CheckInNotification,
  CheckInSeriesInboxNotice,
  CheckInSeriesNotification,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { CHECK_IN_PARTIES } from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  NotificationDraft,
  NotificationFacts,
  NotificationRecipientSnapshot,
} from "~/bounded-contexts/clients/notifications/public";

import {
  CHECK_IN_BELL_FACTS,
  CHECK_IN_BELL_KINDS,
  type CheckInBellKind,
} from "~/bounded-contexts/clients/check-ins/public/check-in-bell";

type LapsedCheckIn = CheckInExpiry & { party: CheckInNotice["recipient"] };

const CHECK_IN_LAPSE_KINDS: readonly CheckInLapseKind[] = [
  "request_expired",
  "new_time_expired",
  "clash_missed",
];

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

  lapseOf(lapsedCheckIn: LapsedCheckIn): NotificationDraft {
    const { checkIn, lapse, party, client } = lapsedCheckIn;
    const notice: CheckInNotice = { checkIn, client, recipient: party };

    return this.draftOf({
      kind: LAPSE_KINDS[lapse.kind],
      recipient: this.recipientOf(notice),
      facts: this.momentFactsOf(notice),
      arrivedAt: lapse.lapsedAt,
      onceKey: this.lapseKeyOf(checkIn.id, lapse.kind, party),
    });
  }

  lapseKeysOf(checkInId: string): string[] {
    return CHECK_IN_LAPSE_KINDS.flatMap((kind) =>
      CHECK_IN_PARTIES.map((party) => this.lapseKeyOf(checkInId, kind, party)),
    );
  }

  private lapseKeyOf(
    checkInId: string,
    kind: CheckInLapseKind,
    party: CheckInNotice["recipient"],
  ): string {
    return `check-in:${checkInId}:${kind}:${party}`;
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
