import type { ClientIdentities } from "../client";

import type {
  CheckIn,
  CheckInLapse,
  CheckInLapseKind,
  CheckInSnapshot,
} from "./check-in";
import type { CheckInNotice } from "./check-in-notifications";
import type { CheckInParty } from "./check-in-party";
import type { CheckIns } from "./check-ins";

export type LapsedCheckIn = {
  checkIn: CheckInSnapshot;
  lapse: CheckInLapseKind;
  lapsedAt: Date;
  party: CheckInParty;
  client: CheckInNotice["client"];
};

export type ListLapsedCheckInsQuery = (
  { party: "coach"; clientId: null } | { party: "client"; clientId: string }
) & { since: Date; at: Date };

type ListLapsedCheckInsUseCaseOptions = {
  checkIns: Pick<CheckIns, "listAll" | "listForClient">;
  identities: Pick<ClientIdentities, "findByClientIds">;
};

type Lapsed = { checkIn: CheckIn; lapse: CheckInLapse };

export class ListLapsedCheckInsUseCase {
  constructor(private readonly options: ListLapsedCheckInsUseCaseOptions) {}

  async execute(query: ListLapsedCheckInsQuery): Promise<LapsedCheckIn[]> {
    const listed =
      query.party === "coach"
        ? await this.options.checkIns.listAll()
        : await this.options.checkIns.listForClient(query.clientId);
    const lapsed = listed.flatMap((checkIn): Lapsed[] => {
      const lapse = checkIn.lapseAt(query.at);

      return lapse && lapse.lapsedAt >= query.since ? [{ checkIn, lapse }] : [];
    });

    if (lapsed.length === 0) {
      return [];
    }

    const identities = await this.options.identities.findByClientIds([
      ...new Set(lapsed.map(({ checkIn }) => checkIn.clientId)),
    ]);

    return lapsed.flatMap(({ checkIn, lapse }): LapsedCheckIn[] => {
      const client = identities.find(
        (identity) => identity.clientId === checkIn.clientId,
      );

      return client
        ? [
            {
              checkIn: checkIn.toSnapshot(),
              ...lapse,
              party: query.party,
              client,
            },
          ]
        : [];
    });
  }
}
