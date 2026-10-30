import type { ClientReachPort, PortalReach } from "./client-reach-port";

export type ClientCheckInScheduling =
  "allowed" | "awaiting_onboarding" | "ended" | "unknown";

type ReadClientCheckInSchedulingUseCaseOptions = {
  clientReachPort: Pick<ClientReachPort, "findById">;
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
    const client = await this.options.clientReachPort.findById(clientId);

    return client ? SCHEDULING_BY_REACH[client.portal] : "unknown";
  }
}
