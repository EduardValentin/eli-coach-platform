import type { VisitorCountries } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { Clock } from "../clock";

import type { ClientIdentities } from "./client-identities";
import type { ClientIdentityChanges } from "./client-identity-changes";
import {
  ClientIdentityEdit,
  type ClientIdentityProblems,
  type EditableClientIdentity,
} from "./client-identity-edit";
import type { ClientReach } from "./client-reach";

type UpdateOwnClientIdentityCommand = {
  authSubjectId: string;
  identity: EditableClientIdentity;
};

type UpdateOwnClientIdentityResult =
  | { status: "saved" }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "invalid"; problems: ClientIdentityProblems };

type UpdateOwnClientIdentityUseCaseOptions = {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  identities: Pick<ClientIdentities, "findByClientId">;
  changes: ClientIdentityChanges;
  clock: Clock;
  countries: VisitorCountries;
};

export class UpdateOwnClientIdentityUseCase {
  constructor(
    private readonly options: UpdateOwnClientIdentityUseCaseOptions,
  ) {}

  async execute(
    command: UpdateOwnClientIdentityCommand,
  ): Promise<UpdateOwnClientIdentityResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    if (client.portal === "ended") {
      return { status: "ended" };
    }

    const current = await this.options.identities.findByClientId(
      client.clientId,
    );

    if (!current) {
      return { status: "not-on-journey" };
    }

    const result = ClientIdentityEdit.of(
      {
        ...command.identity,
        clientId: client.clientId,
        gender: current.gender,
      },
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
