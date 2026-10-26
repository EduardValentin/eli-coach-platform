import {
  ClientProfileComposite,
  type ClientProfileReading,
  type ClientProfileReadingPorts,
} from "./client-profile-composite";

export class ReadClientProfileUseCase {
  constructor(private readonly options: ClientProfileReadingPorts) {}

  async execute(clientId: string): Promise<ClientProfileReading | null> {
    return new ClientProfileComposite(this.options).readFor(clientId);
  }
}
