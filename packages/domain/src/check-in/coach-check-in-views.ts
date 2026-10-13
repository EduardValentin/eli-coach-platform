import type { ClientIdentities, ClientIdentity } from "../client";
import type { Clock } from "../shared";

import { CheckIn, type CheckInView } from "./check-in";
import type { CheckIns } from "./check-ins";

export type CoachCheckInView = CheckInView & {
  client: Pick<ClientIdentity, "firstName" | "lastName">;
};

type CoachCheckInViewsOptions = {
  checkIns: Pick<CheckIns, "listAll">;
  clock: Clock;
  identities: Pick<ClientIdentities, "findByClientIds">;
};

export class CoachCheckInViews {
  constructor(private readonly options: CoachCheckInViewsOptions) {}

  async list(): Promise<CoachCheckInView[]> {
    const checkIns = await this.options.checkIns.listAll();
    const identities = await this.options.identities.findByClientIds(
      this.clientIdsOf(checkIns),
    );
    const identityByClientId = new Map(
      identities.map((identity) => [identity.clientId, identity]),
    );
    const now = this.options.clock.now();

    return [...checkIns].sort(CheckIn.byStart).flatMap((checkIn) => {
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
