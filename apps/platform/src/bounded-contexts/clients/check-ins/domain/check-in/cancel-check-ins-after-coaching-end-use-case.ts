import type { Clock } from "../clock";

import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInbox } from "./check-in-inbox";
import type { CheckInIncidents } from "./check-in-incidents";
import type { CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CoachingEndResult = { cancelled: number; seriesStopped: boolean };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkIns: Pick<CheckIns, "endCoaching">;
  clock: Clock;
  coachTime: Pick<CoachTime, "release">;
  inbox: Pick<CheckInInbox, "scheduleExpiries">;
  incidents: Pick<CheckInIncidents, "checkInInboxFailed">;
};

export class CancelCheckInsAfterCoachingEndUseCase {
  constructor(
    private readonly options: CancelCheckInsAfterCoachingEndUseCaseOptions,
  ) {}

  async execute({
    clientId,
    endsAt,
  }: CoachingEndCommand): Promise<CoachingEndResult> {
    const { cancelled, seriesStopped, freedReservationIds } =
      await this.options.checkIns.endCoaching({
        clientId,
        endsAt,
        at: this.options.clock.now(),
      });

    await releaseFreedHours(this.options.coachTime, freedReservationIds);
    await this.withdrawExpiries(cancelled);

    return { cancelled: cancelled.length, seriesStopped };
  }

  private async withdrawExpiries(cancelled: readonly string[]): Promise<void> {
    try {
      await this.options.inbox.scheduleExpiries({
        withdrawn: cancelled,
        upcoming: [],
      });
    } catch {
      for (const checkInId of cancelled) {
        this.options.incidents.checkInInboxFailed({
          checkInId,
          event: "cancelled",
        });
      }
    }
  }
}
