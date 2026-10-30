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
  cancelCheckInsAfterCoachingEndUseCase: CancelCheckInsAfterCoachingEndUseCase;
  extendCheckInSeriesUseCase: ExtendCheckInSeriesUseCase;
  checkInIncidentsPort: Pick<
    CheckInIncidentsPort,
    "checkInSeriesExtensionFailed"
  >;
  unitOfWork: UnitOfWork;
};

export class CoachingPeriodsFacadeAdapter implements CoachingPeriodsFacade {
  constructor(private readonly options: CoachingPeriodsFacadeOptions) {}

  async startCoachingPeriod({ clientId }: CoachingPeriodDto) {
    try {
      await this.options.unitOfWork(() =>
        this.options.extendCheckInSeriesUseCase.execute({ clientId }),
      );
    } catch (error) {
      this.options.checkInIncidentsPort.checkInSeriesExtensionFailed({
        clientId,
        error,
      });
    }
  }

  async endCoaching({ clientId, endsAt }: CoachingEndDto) {
    await this.options.unitOfWork(() =>
      this.options.cancelCheckInsAfterCoachingEndUseCase.execute({
        clientId,
        endsAt: new Date(endsAt),
      }),
    );
  }
}
