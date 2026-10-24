import {
  ClientProfileReadings,
  type ClientProfileReading,
  type ClientProfileReadingPorts,
} from "./client-profile-readings";

export class ReadClientProfileUseCase {
  constructor(private readonly options: ClientProfileReadingPorts) {}

  async execute(clientId: string): Promise<ClientProfileReading | null> {
    return new ClientProfileReadings(this.options).of(clientId);
  }
}
