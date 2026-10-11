import type { Clock } from "../shared";

import type { CheckIns } from "./check-ins";

type CoachingEndCommand = { clientId: string; endsAt: Date };

type CancelCheckInsAfterCoachingEndUseCaseOptions = {
  checkIns: Pick<CheckIns, "cancelFrom">;
  clock: Clock;
};

export class CancelCheckInsAfterCoachingEndUseCase {
  constructor(
    private readonly options: CancelCheckInsAfterCoachingEndUseCaseOptions,
  ) {}

  async execute({
    clientId,
    endsAt,
  }: CoachingEndCommand): Promise<{ cancelled: number }> {
    const { cancelled } = await this.options.checkIns.cancelFrom({
      clientId,
      from: endsAt,
      at: this.options.clock.now(),
    });

    return { cancelled: cancelled.length };
  }
}
