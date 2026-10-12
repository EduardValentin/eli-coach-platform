import type { ClientReach, PortalReach } from "../client";

export type ClientCheckInScheduling =
  "allowed" | "awaiting_onboarding" | "ended" | "unknown";

type ReadClientCheckInSchedulingUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
};

const SCHEDULING_BY_REACH: Record<PortalReach, ClientCheckInScheduling> = {
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
