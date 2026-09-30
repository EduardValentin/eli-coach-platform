import type { ClientProfileSnapshot } from "./client-profile";
import type { ClientProfiles } from "./client-profiles";

type ReadClientProfileUseCaseOptions = {
  profiles: ClientProfiles;
};

export class ReadClientProfileUseCase {
  constructor(private readonly options: ReadClientProfileUseCaseOptions) {}

  async execute(clientId: string): Promise<ClientProfileSnapshot | null> {
    const profile = await this.options.profiles.findByClientId(clientId);

    return profile?.toSnapshot() ?? null;
  }
}
