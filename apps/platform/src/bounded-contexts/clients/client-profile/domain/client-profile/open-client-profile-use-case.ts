import type { ClientProfileOpeningsPort } from "./client-profile-openings-port";

export class OpenClientProfileUseCase {
  constructor(
    private readonly options: { openings: ClientProfileOpeningsPort },
  ) {}

  async execute(admission: { clientId: string; at: Date }): Promise<void> {
    await this.options.openings.open(admission);
  }
}
