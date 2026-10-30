import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckInView } from "./check-in";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInsPort } from "./check-ins-port";

export type ListClientCheckInsResult =
  { status: "listed"; checkIns: CheckInView[] } | { status: "ended" };

type ListClientCheckInsUseCaseOptions = {
  checkInsPort: CheckInsPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
};

export class ListClientCheckInsUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: ListClientCheckInsUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(authSubjectId: string): Promise<ListClientCheckInsResult> {
    const clientId = await this.reach.reachableClientIdOf(authSubjectId);

    if (!clientId) {
      return { status: "ended" };
    }

    const checkIns = await this.options.checkInsPort.listForClient(clientId);
    const now = this.options.clockPort.now();

    return {
      status: "listed",
      checkIns: checkIns.map((checkIn) =>
        checkIn.viewAmong({
          party: "client",
          at: now,
          clientCheckIns: checkIns,
        }),
      ),
    };
  }
}
