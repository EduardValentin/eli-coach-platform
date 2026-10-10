import type { Clock } from "../shared";

import type { CheckInView } from "./check-in";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInClients } from "./check-in-clients";
import type { CheckIns } from "./check-ins";

export type ListClientCheckInsResult =
  { status: "listed"; checkIns: CheckInView[] } | { status: "ended" };

type ListClientCheckInsUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "findByAuthSubjectId">;
  clock: Clock;
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

    const checkIns = await this.options.checkIns.listForClient(clientId);
    const now = this.options.clock.now();

    return {
      status: "listed",
      checkIns: checkIns.map((checkIn) =>
        checkIn.viewFor({ party: "client", at: now }),
      ),
    };
  }
}
