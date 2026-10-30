import type { ClientReachPort } from "../client-reach-port";

import {
  ClientProfileComposite,
  type ClientProfileReading,
  type ClientProfileReadingPorts,
} from "./client-profile-composite";

export type OwnClientProfileReading = Omit<ClientProfileReading, "coachNotes">;

type ReadOwnClientProfileUseCaseOptions = ClientProfileReadingPorts & {
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
};

export class ReadOwnClientProfileUseCase {
  constructor(private readonly options: ReadOwnClientProfileUseCaseOptions) {}

  async execute(
    authSubjectId: string,
  ): Promise<OwnClientProfileReading | null> {
    const client =
      await this.options.clientReachPort.findByAuthSubjectId(authSubjectId);
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
