import type { CheckInClients, CheckInPortalReach } from "./check-in-clients";

export type ClientCheckInScheduling =
  "allowed" | "awaiting_onboarding" | "ended" | "unknown";

type ReadClientCheckInSchedulingUseCaseOptions = {
  clients: Pick<CheckInClients, "findById">;
};

const SCHEDULING_BY_REACH: Record<CheckInPortalReach, ClientCheckInScheduling> =
  {
    reachable: "allowed",
    awaiting_onboarding: "awaiting_onboarding",
    ended: "ended",
  };

export class ReadClientCheckInSchedulingUseCase {
  constructor(
    private readonly options: ReadClientCheckInSchedulingUseCaseOptions,
  ) {}

  async execute(clientId: string): Promise<ClientCheckInScheduling> {
    const client = await this.options.clients.findById(clientId);

    return client ? SCHEDULING_BY_REACH[client.portal] : "unknown";
  }
}
