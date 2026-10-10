import type { CheckIn, CheckInOutcome, CheckInSnapshot } from "./check-in";
import { CheckInAnnouncer } from "./check-in-announcer";
import type { CheckInClients } from "./check-in-clients";
import type { CheckInIncidents } from "./check-in-incidents";
import type {
  CheckInNotification,
  CheckInNotifications,
} from "./check-in-notifications";
import type { CheckIns } from "./check-ins";

type CheckInSettlerOptions = {
  checkIns: CheckIns;
  clients: CheckInClients;
  incidents: CheckInIncidents;
  notifications: CheckInNotifications;
};

type Settlement = {
  checkIn: CheckIn;
  outcome: CheckInOutcome;
  notification: CheckInNotification;
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
    const { checkIn, outcome, notification, at } = settlement;
    const recorded = await this.options.checkIns.settle({
      id: checkIn.id,
      outcome,
      at,
    });

    if (recorded === "not_pending") {
      return { status: "not_pending" };
    }

    const settled = checkIn.settled({ outcome, at });

    await this.announcer.announce(notification, settled);

    return { status: "settled", checkIn: settled.toSnapshot() };
  }
}
