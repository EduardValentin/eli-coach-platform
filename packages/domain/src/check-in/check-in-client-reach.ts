import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckInClients } from "./check-in-clients";
import { CheckInTimeZone } from "./check-in-time-zone";
import type { CheckIns } from "./check-ins";

export type CheckInActorCommand = {
  checkInId: string;
  actor: CheckInActor;
  clientTimeZone?: string;
};

type ReachedCheckIn =
  | {
      status: "reached";
      checkIn: CheckIn;
      clientTimeZone: CheckInTimeZone | null;
    }
  | { status: "unknown" }
  | { status: "ended" }
  | { status: "invalid_time_zone" };

type AnsweringZone =
  { status: "valid"; timeZone: CheckInTimeZone | null } | { status: "invalid" };

type CheckInClientReachOptions = {
  checkIns: Pick<CheckIns, "find">;
  clients: Pick<CheckInClients, "findByAuthSubjectId">;
};

export class CheckInClientReach {
  constructor(private readonly options: CheckInClientReachOptions) {}

  async reachableClientIdOf(authSubjectId: string): Promise<string | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    return client?.portal === "reachable" ? client.clientId : null;
  }

  async checkInReachedBy(
    command: CheckInActorCommand,
  ): Promise<ReachedCheckIn> {
    const { actor } = command;

    if (actor.party === "coach") {
      const checkIn = await this.options.checkIns.find(command.checkInId);

      return checkIn
        ? { status: "reached", checkIn, clientTimeZone: null }
        : { status: "unknown" };
    }

    const zone = this.answeringZoneOf(command.clientTimeZone);

    if (zone.status === "invalid") {
      return { status: "invalid_time_zone" };
    }

    const clientId = await this.reachableClientIdOf(actor.authSubjectId);

    if (!clientId) {
      return { status: "ended" };
    }

    const checkIn = await this.options.checkIns.find(command.checkInId);

    if (!checkIn?.isFor(clientId)) {
      return { status: "unknown" };
    }

    return { status: "reached", checkIn, clientTimeZone: zone.timeZone };
  }

  private answeringZoneOf(candidate: string | undefined): AnsweringZone {
    return candidate === undefined
      ? { status: "valid", timeZone: null }
      : CheckInTimeZone.from(candidate);
  }
}
