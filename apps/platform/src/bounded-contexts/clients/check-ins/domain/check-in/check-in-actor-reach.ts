import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";

import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { CheckIns } from "./check-ins";

type ReachedCheckIn =
  | { status: "reached"; checkIn: CheckIn }
  | { status: "unknown" }
  | { status: "ended" };

type CheckInActorReachOptions = {
  checkIns: Pick<CheckIns, "find">;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
};

export class CheckInActorReach {
  constructor(private readonly options: CheckInActorReachOptions) {}

  async reachableClientOf(
    authSubjectId: string,
  ): Promise<ClientReachReading | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);

    return client?.portal === "reachable" ? client : null;
  }

  async reachableClientIdOf(authSubjectId: string): Promise<string | null> {
    const client = await this.reachableClientOf(authSubjectId);

    return client?.clientId ?? null;
  }

  async checkInReachedBy({
    actor,
    checkInId,
  }: {
    actor: CheckInActor;
    checkInId: string;
  }): Promise<ReachedCheckIn> {
    if (actor.party === "coach") {
      const checkIn = await this.options.checkIns.find(checkInId);

      return checkIn ? { status: "reached", checkIn } : { status: "unknown" };
    }

    const clientId = await this.reachableClientIdOf(actor.authSubjectId);

    if (!clientId) {
      return { status: "ended" };
    }

    const checkIn = await this.options.checkIns.find(checkInId);

    if (!checkIn?.isFor(clientId)) {
      return { status: "unknown" };
    }

    return { status: "reached", checkIn };
  }
}
