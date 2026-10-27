import type { Clock } from "../clock";

import { releaseFreedHours } from "./check-in-hour-release";
import type { CheckIns } from "./check-ins";
import type { CoachTime } from "./coach-time";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CoachingEndResult = { cancelled: number; seriesStopped: boolean };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkIns: Pick<CheckIns, "endCoaching">;
  clock: Clock;
  coachTime: Pick<CoachTime, "release">;
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

    return { cancelled: cancelled.length, seriesStopped };
  }
}
