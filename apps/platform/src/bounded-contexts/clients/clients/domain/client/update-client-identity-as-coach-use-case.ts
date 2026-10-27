import type { Clock } from "../clock";

import type { ClientCountries, ClientGender } from "./client-details";
import type { ClientIdentityChanges } from "./client-identity-changes";
import {
  ClientIdentityEdit,
  type ClientIdentityProblems,
  type EditableClientIdentity,
} from "./client-identity-edit";
import type { ClientReach } from "./client-reach";

type UpdateClientIdentityAsCoachCommand = {
  clientId: string;
  identity: EditableClientIdentity & { gender: ClientGender };
};

type UpdateClientIdentityAsCoachResult =
  | { status: "saved" }
  | { status: "not-found" }
  | { status: "invalid"; problems: ClientIdentityProblems };

type UpdateClientIdentityAsCoachUseCaseOptions = {
  clients: Pick<ClientReach, "findById">;
  changes: ClientIdentityChanges;
  clock: Clock;
  countries: ClientCountries;
};

export class UpdateClientIdentityAsCoachUseCase {
  constructor(
    private readonly options: UpdateClientIdentityAsCoachUseCaseOptions,
  ) {}

  async execute(
    command: UpdateClientIdentityAsCoachCommand,
  ): Promise<UpdateClientIdentityAsCoachResult> {
    const client = await this.options.clients.findById(command.clientId);

    if (!client) {
      return { status: "not-found" };
    }

    const result = ClientIdentityEdit.of(
      { ...command.identity, clientId: client.clientId },
      { on: this.options.clock.now(), timeZone: client.timeZone },
      this.options.countries,
    );

    if (result.status === "invalid") {
      return result;
    }

    await this.options.changes.save(result.edit);

    return { status: "saved" };
  }
}
