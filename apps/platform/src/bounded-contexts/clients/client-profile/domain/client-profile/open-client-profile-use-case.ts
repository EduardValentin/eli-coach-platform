import type { ClientProfileOpenings } from "./client-profile-openings";

export class OpenClientProfileUseCase {
  constructor(private readonly options: { openings: ClientProfileOpenings }) {}

  async execute(admission: { clientId: string; at: Date }): Promise<void> {
    await this.options.openings.open(admission);
  }
}
