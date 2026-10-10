import type { Clock } from "../shared";

import type { CheckIn, CheckInView } from "./check-in";
import type { CheckInClientIdentity, CheckInClients } from "./check-in-clients";
import type { CheckIns } from "./check-ins";

export type CoachCheckInView = CheckInView & {
  client: Pick<CheckInClientIdentity, "firstName" | "lastName">;
};

type ListCoachCheckInsUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<CheckInClients, "identitiesOf">;
  clock: Clock;
};

export class ListCoachCheckInsUseCase {
  constructor(private readonly options: ListCoachCheckInsUseCaseOptions) {}

  async execute(): Promise<CoachCheckInView[]> {
    const checkIns = await this.options.checkIns.listAll();
    const identities = await this.options.clients.identitiesOf(
      this.clientIdsOf(checkIns),
    );
    const identityByClientId = new Map(
      identities.map((identity) => [identity.clientId, identity]),
    );
    const now = this.options.clock.now();

    return checkIns.flatMap((checkIn) => {
      const identity = identityByClientId.get(checkIn.clientId);

      if (!identity) {
        return [];
      }

      return [
        {
          ...checkIn.viewFor({ party: "coach", at: now }),
          client: {
            firstName: identity.firstName,
            lastName: identity.lastName,
          },
        },
      ];
    });
  }

  private clientIdsOf(checkIns: readonly CheckIn[]): string[] {
    return [...new Set(checkIns.map((checkIn) => checkIn.clientId))];
  }
}
