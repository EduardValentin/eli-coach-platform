import type {
  CancelCheckInsAfterCoachingEndUseCase,
  CheckInIncidents,
  ExtendCheckInSeriesUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { CoachingPeriodsFacade } from "~/bounded-contexts/clients/public/coaching-periods";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type CoachingPeriodsFacadeOptions = {
  cancelCheckInsAfterCoachingEnd: CancelCheckInsAfterCoachingEndUseCase;
  extendCheckInSeries: ExtendCheckInSeriesUseCase;
  incidents: Pick<CheckInIncidents, "checkInSeriesExtensionFailed">;
  unitOfWork: UnitOfWork;
};

export function createCoachingPeriodsFacade(
  options: CoachingPeriodsFacadeOptions,
): CoachingPeriodsFacade {
  const { unitOfWork } = options;

  return {
    startCoachingPeriod: async ({ clientId }) => {
      try {
        await unitOfWork(() =>
          options.extendCheckInSeries.execute({ clientId }),
        );
      } catch (error) {
        options.incidents.checkInSeriesExtensionFailed({ clientId, error });
      }
    },
    endCoaching: async ({ clientId, endsAt }) => {
      await unitOfWork(() =>
        options.cancelCheckInsAfterCoachingEnd.execute({
          clientId,
          endsAt: new Date(endsAt),
        }),
      );
    },
  };
}
