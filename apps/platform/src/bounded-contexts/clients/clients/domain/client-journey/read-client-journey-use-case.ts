import type { ClientJourney } from "./client-journey";
import type { ClientJourneys } from "./client-journeys";

export class ReadClientJourneyUseCase {
  constructor(private readonly options: { journeys: ClientJourneys }) {}

  async execute(authSubjectId: string): Promise<ClientJourney | null> {
    return this.options.journeys.findByAuthSubjectId(authSubjectId);
  }
}
