import type { Clock } from "../shared";

import type { CheckInView } from "./check-in";
import { CheckInClientReach } from "./check-in-client-reach";
import type { CheckInClients } from "./check-in-clients";
import type { CheckIns } from "./check-ins";

export type ListClientCheckInsResult =
  { status: "listed"; checkIns: CheckInView[] } | { status: "ended" };

type ListClientCheckInsUseCaseOptions = {
  checkIns: CheckIns;
  clients: CheckInClients;
  clock: Clock;
};

export class ListClientCheckInsUseCase {
  private readonly reach: CheckInClientReach;

  constructor(private readonly options: ListClientCheckInsUseCaseOptions) {
    this.reach = new CheckInClientReach(options);
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
