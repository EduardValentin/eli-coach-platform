import type { ClockPort } from "../clock-port";

import type { CoachingSubscriptionsPort } from "./coaching-subscriptions-port";

type ReadCoachingEndedUseCaseOptions = {
  clockPort: ClockPort;
  coachingSubscriptionsPort: Pick<
    CoachingSubscriptionsPort,
    "findCurrentForClient"
  >;
};

export class ReadCoachingEndedUseCase {
  constructor(private readonly options: ReadCoachingEndedUseCaseOptions) {}

  async execute(clientId: string): Promise<boolean> {
    const subscription =
      await this.options.coachingSubscriptionsPort.findCurrentForClient(
        clientId,
      );

    return (
      subscription !== null &&
      !subscription.hasPortalAccessAt(this.options.clockPort.now())
    );
  }
}
