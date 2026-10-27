import type {
  ClientReach,
  ClientReachReading,
} from "~/bounded-contexts/clients/clients/domain/client";
import type {
  CoachAvailabilitySource,
  CoachCalendar,
} from "~/bounded-contexts/scheduling/coach-schedule/domain/coach-availability";
import type { Clock } from "../clock";

import { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import { CHECK_IN_RULES } from "./check-in-rules";

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
  availability: CoachAvailabilitySource;
  calendar: CoachCalendar;
  clients: Pick<ClientReach, "findByAuthSubjectId" | "findById">;
  clock: Clock;
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

    const now = this.options.clock.now();
    const [availability, busy] = await Promise.all([
      this.options.availability.current(),
      this.options.calendar.busyFrom(now),
    ]);
    const { coachingEndsAt } = found.client;

    return {
      status: "listed",
      times: availability
        .openSlotStarts({ now, policy: CHECK_IN_RULES, busy })
        .filter((startsAt) =>
          CheckIn.startsBeforeCoachingEnd({ startsAt, coachingEndsAt }),
        ),
    };
  }

  private async clientFor({
    actor,
    clientId,
  }: ListOpenCheckInTimesCommand): Promise<OpenTimesClient> {
    if (actor.party === "client") {
      const client = await this.options.clients.findByAuthSubjectId(
        actor.authSubjectId,
      );

      return client ? { status: "found", client } : { status: "ended" };
    }

    if (clientId === undefined) {
      return { status: "client_required" };
    }

    const client = await this.options.clients.findById(clientId);

    return client ? { status: "found", client } : { status: "unknown_client" };
  }
}
