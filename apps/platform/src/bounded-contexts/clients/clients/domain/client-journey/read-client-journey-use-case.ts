import type { ClientJourney } from "./client-journey";
import type { ClientJourneysPort } from "./client-journeys-port";

export class ReadClientJourneyUseCase {
  constructor(
    private readonly options: { clientJourneysPort: ClientJourneysPort },
  ) {}

  async execute(authSubjectId: string): Promise<ClientJourney | null> {
    return this.options.clientJourneysPort.findByAuthSubjectId(authSubjectId);
  }
}
