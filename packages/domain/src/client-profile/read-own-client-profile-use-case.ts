import type { ClientReach } from "../client";

import {
  ClientProfileComposite,
  type ClientProfileReading,
  type ClientProfileReadingPorts,
} from "./client-profile-composite";

export type OwnClientProfileReading = Omit<ClientProfileReading, "coachNotes">;

type ReadOwnClientProfileUseCaseOptions = ClientProfileReadingPorts & {
  clients: Pick<ClientReach, "findByAuthSubjectId">;
};

export class ReadOwnClientProfileUseCase {
  constructor(private readonly options: ReadOwnClientProfileUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<OwnClientProfileReading | null> {
    const client =
      await this.options.clients.findByAuthSubjectId(authSubjectId);
    const reading =
      client &&
      (await new ClientProfileComposite(this.options).readFor(client.clientId));

    if (!reading) {
      return null;
    }

    const { coachNotes: _coachNotes, ...own } = reading;

    return own;
  }
}
