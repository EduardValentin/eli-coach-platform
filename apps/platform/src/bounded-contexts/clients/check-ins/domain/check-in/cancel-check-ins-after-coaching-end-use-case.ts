import type { ClockPort } from "../clock-port";

import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CoachingEndResult = { cancelled: number; seriesStopped: boolean };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkIns: Pick<CheckInsPort, "endCoaching">;
  clock: ClockPort;
  coachTime: Pick<CoachTimePort, "release">;
  inbox: Pick<CheckInInboxPort, "scheduleExpiries">;
  incidents: Pick<CheckInIncidentsPort, "checkInInboxFailed">;
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
      this.reportInboxFailures(cancelled);
    }
  }

  private reportInboxFailures(cancelled: readonly string[]): void {
    for (const checkInId of cancelled) {
      this.options.incidents.checkInInboxFailed({
        checkInId,
        event: "cancelled",
      });
    }
  }
}
