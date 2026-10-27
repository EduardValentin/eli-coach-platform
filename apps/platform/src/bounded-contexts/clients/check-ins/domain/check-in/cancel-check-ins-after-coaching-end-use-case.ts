import type { Clock } from "../clock";

import type { CheckIns } from "./check-ins";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CoachingEndResult = { cancelled: number; seriesStopped: boolean };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkIns: Pick<CheckIns, "endCoaching">;
  clock: Clock;
};

export class CancelCheckInsAfterCoachingEndUseCase {
  constructor(
    private readonly options: CancelCheckInsAfterCoachingEndUseCaseOptions,
  ) {}

  async execute({
    clientId,
    endsAt,
  }: CoachingEndCommand): Promise<CoachingEndResult> {
    const { cancelled, seriesStopped } =
      await this.options.checkIns.endCoaching({
        clientId,
        endsAt,
        at: this.options.clock.now(),
      });

    return { cancelled: cancelled.length, seriesStopped };
  }
}
