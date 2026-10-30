import type { ClockPort } from "../clock-port";

import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckInInboxPort } from "./check-in-inbox-port";
import type { CheckInIncidentsPort } from "./check-in-incidents-port";
import type { CheckInsPort } from "./check-ins-port";
import type { CoachTimePort } from "./coach-time-port";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CoachingEndResult = { cancelled: number; seriesStopped: boolean };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkInsPort: Pick<CheckInsPort, "endCoaching">;
  clockPort: ClockPort;
  coachTimePort: Pick<CoachTimePort, "release">;
  checkInInboxPort: Pick<CheckInInboxPort, "scheduleExpiries">;
  checkInIncidentsPort: Pick<CheckInIncidentsPort, "checkInInboxFailed">;
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
      await this.options.checkInsPort.endCoaching({
        clientId,
        endsAt,
        at: this.options.clockPort.now(),
      });

    await releaseFreedHours(this.options.coachTimePort, freedReservationIds);
    await this.withdrawExpiries(cancelled);

    return { cancelled: cancelled.length, seriesStopped };
  }

  private async withdrawExpiries(cancelled: readonly string[]): Promise<void> {
    try {
      await this.options.checkInInboxPort.scheduleExpiries({
        withdrawn: cancelled,
        upcoming: [],
      });
    } catch {
      this.reportInboxFailures(cancelled);
    }
  }

  private reportInboxFailures(cancelled: readonly string[]): void {
    for (const checkInId of cancelled) {
      this.options.checkInIncidentsPort.checkInInboxFailed({
        checkInId,
        event: "cancelled",
      });
    }
  }
}
