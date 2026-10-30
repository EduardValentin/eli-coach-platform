import type {
  CancelCheckInsAfterCoachingEndUseCase,
  CheckInIncidentsPort,
  ExtendCheckInSeriesUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type {
  CoachingPeriodsFacade,
  CoachingPeriodDto,
  CoachingEndDto,
} from "~/bounded-contexts/clients/public/coaching-periods-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type CoachingPeriodsFacadeOptions = {
  cancelCheckInsAfterCoachingEnd: CancelCheckInsAfterCoachingEndUseCase;
  extendCheckInSeries: ExtendCheckInSeriesUseCase;
  incidents: Pick<CheckInIncidentsPort, "checkInSeriesExtensionFailed">;
  unitOfWork: UnitOfWork;
};

export class CoachingPeriodsFacadeAdapter implements CoachingPeriodsFacade {
  constructor(private readonly options: CoachingPeriodsFacadeOptions) {}

  async startCoachingPeriod({ clientId }: CoachingPeriodDto) {
    try {
      await this.options.unitOfWork(() =>
        this.options.extendCheckInSeries.execute({ clientId }),
      );
    } catch (error) {
      this.options.incidents.checkInSeriesExtensionFailed({ clientId, error });
    }
  }

  async endCoaching({ clientId, endsAt }: CoachingEndDto) {
    await this.options.unitOfWork(() =>
      this.options.cancelCheckInsAfterCoachingEnd.execute({
        clientId,
        endsAt: new Date(endsAt),
      }),
    );
  }
}
