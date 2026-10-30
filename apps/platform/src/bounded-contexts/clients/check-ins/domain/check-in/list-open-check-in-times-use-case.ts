import type { ClientReachPort, ClientReachReading } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import type { OpenSlotsPort } from "./open-slots-port";

export type ListOpenCheckInTimesCommand = {
  actor: CheckInActor;
  clientId?: string;
};

export type ListOpenCheckInTimesResult =
  | { status: "listed"; times: Date[] }
  | { status: "client_required" }
  | { status: "unknown_client" }
  | { status: "ended" };

type OpenTimesClient =
  | { status: "found"; client: ClientReachReading }
  | Exclude<ListOpenCheckInTimesResult, { status: "listed" }>;

type ListOpenCheckInTimesUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId" | "findById">;
  clockPort: ClockPort;
  openSlotsPort: Pick<OpenSlotsPort, "openStarts">;
};

export class ListOpenCheckInTimesUseCase {
  constructor(private readonly options: ListOpenCheckInTimesUseCaseOptions) {}

  async execute(
    command: ListOpenCheckInTimesCommand,
  ): Promise<ListOpenCheckInTimesResult> {
    const found = await this.clientFor(command);

    if (found.status !== "found") {
      return found;
    }

    const now = this.options.clockPort.now();
    const starts = await this.options.openSlotsPort.openStarts(now);
    const { coachingEndsAt } = found.client;

    return {
      status: "listed",
      times: starts.filter((startsAt) =>
        CheckIn.startsBeforeCoachingEnd({ startsAt, coachingEndsAt }),
      ),
    };
  }

  private async clientFor({
    actor,
    clientId,
  }: ListOpenCheckInTimesCommand): Promise<OpenTimesClient> {
    if (actor.party === "client") {
      const client = await this.options.clientReachPort.findByAuthSubjectId(
        actor.authSubjectId,
      );

      return client ? { status: "found", client } : { status: "ended" };
    }

    if (clientId === undefined) {
      return { status: "client_required" };
    }

    const client = await this.options.clientReachPort.findById(clientId);

    return client ? { status: "found", client } : { status: "unknown_client" };
  }
}
