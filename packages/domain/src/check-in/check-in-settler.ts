import type {
  CheckIn,
  CheckInOutcome,
  CheckInParty,
  CheckInSnapshot,
} from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type {
  CheckInNotification,
  CheckInNotifications,
} from "./check-in-notifications";
import type { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckIns } from "./check-ins";

type CheckInSettlerOptions = {
  checkIns: Pick<CheckIns, "settle">;
  clients: Pick<CheckInClients, "identitiesOf">;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

type Settlement = {
  checkIn: CheckIn;
  outcome: CheckInOutcome;
  notification: CheckInNotification;
  actedBy: CheckInParty;
  clientTimeZone: CheckInTimeZone | null;
  at: Date;
};

export type SettledCheckIn =
  { status: "settled"; checkIn: CheckInSnapshot } | { status: "not_pending" };

export class CheckInSettler {
  private readonly announcer: CheckInAnnouncer;

  constructor(private readonly options: CheckInSettlerOptions) {
    this.announcer = new CheckInAnnouncer(options);
  }

  async settle(settlement: Settlement): Promise<SettledCheckIn> {
    const { checkIn, outcome, notification, actedBy, clientTimeZone, at } =
      settlement;
    const recorded = await this.options.checkIns.settle({
      id: checkIn.id,
      outcome,
      at,
      ...(clientTimeZone && { clientTimeZone: clientTimeZone.name }),
    });

    if (recorded === "not_pending") {
      return { status: "not_pending" };
    }

    const settled = checkIn.settled({ outcome, at, clientTimeZone });

    await this.announcer.announce(notification, settled, actedBy);

    return { status: "settled", checkIn: settled.toSnapshot() };
  }
}
