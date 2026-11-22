import type { ReadCoachingEndedUseCase } from "~/bounded-contexts/sales/subscriptions/domain/coaching-subscription";
import type {
  CoachingEndedDto,
  CoachingEndedFacade,
} from "~/bounded-contexts/sales/public/coaching-ended-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type CoachingEndedFacadeAdapterOptions = {
  readCoachingEndedUseCase: ReadCoachingEndedUseCase;
  unitOfWork: UnitOfWork;
};

export class CoachingEndedFacadeAdapter implements CoachingEndedFacade {
  constructor(private readonly options: CoachingEndedFacadeAdapterOptions) {}

  async coachingEndedOf(clientId: string): Promise<CoachingEndedDto> {
    const coachingEnded = await this.options.unitOfWork(() =>
      this.options.readCoachingEndedUseCase.execute(clientId),
    );

    return { clientId, coachingEnded };
  }
}
