import type { ClientJourney } from "./client-journey";
import type { ClientJourneysPort } from "./client-journeys-port";

export class ReadClientJourneyUseCase {
  constructor(private readonly options: { journeys: ClientJourneysPort }) {}

  async execute(authSubjectId: string): Promise<ClientJourney | null> {
    return this.options.journeys.findByAuthSubjectId(authSubjectId);
  }
}
