import type { CoachingEndedPort } from "~/bounded-contexts/programs/training-programs/domain/program";
import type { CoachingEndedFacade } from "~/bounded-contexts/sales/public/coaching-ended-facade";

export class SalesCoachingEndedAdapter implements CoachingEndedPort {
  constructor(private readonly coachingEndedFacade: CoachingEndedFacade) {}

  async hasEnded(clientId: string): Promise<boolean> {
    const { coachingEnded } =
      await this.coachingEndedFacade.coachingEndedOf(clientId);

    return coachingEnded;
  }
}
