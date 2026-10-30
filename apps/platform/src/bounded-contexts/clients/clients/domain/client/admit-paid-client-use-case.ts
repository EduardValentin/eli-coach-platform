import { Client, type ClientIntake } from "./client";
import type { AdmittedClientsPort } from "./admitted-clients-port";
import type { ClientIdsPort } from "./client-ids-port";
import {
  CoachingStanding,
  type CoachingStandingSnapshot,
} from "./coaching-standing";

type AdmitPaidClientCommand = {
  intake: ClientIntake;
  at: Date;
  standing: CoachingStandingSnapshot;
};

type AdmitPaidClientResult =
  | { status: "admitted"; clientId: string }
  | { status: "call_already_has_client" };

type AdmitPaidClientUseCaseOptions = {
  clients: Pick<AdmittedClientsPort, "admit">;
  ids: ClientIdsPort;
};

export class AdmitPaidClientUseCase {
  constructor(private readonly options: AdmitPaidClientUseCaseOptions) {}

  async execute(
    command: AdmitPaidClientCommand,
  ): Promise<AdmitPaidClientResult> {
    const client = Client.admitted({
      id: this.options.ids.generate(),
      intake: command.intake,
      at: command.at,
    });
    const admission = await this.options.clients.admit({
      client,
      standing: CoachingStanding.of(command.standing),
    });

    return admission === "admitted"
      ? { status: "admitted", clientId: client.id }
      : { status: admission };
  }
}
