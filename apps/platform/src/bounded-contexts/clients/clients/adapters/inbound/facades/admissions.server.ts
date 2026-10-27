import type {
  AdmitPaidClientUseCase,
  CoachingStandingSnapshot,
  RecordCoachingStandingUseCase,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { InvitePaidClientUseCase } from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type {
  AdmissionsFacade,
  CoachingStandingDto,
} from "~/bounded-contexts/clients/public/admissions";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type AdmissionsFacadeOptions = {
  admitPaidClient: AdmitPaidClientUseCase;
  invitePaidClient: InvitePaidClientUseCase;
  recordCoachingStanding: RecordCoachingStandingUseCase;
  unitOfWork: UnitOfWork;
};

export function createAdmissionsFacade(
  options: AdmissionsFacadeOptions,
): AdmissionsFacade {
  const { unitOfWork } = options;

  return {
    admitPaidClient: async ({ admittedAt, standing, ...intake }) =>
      unitOfWork(() =>
        options.admitPaidClient.execute({
          intake,
          at: new Date(admittedAt),
          standing: standingOf(standing),
        }),
      ),
    invitePaidClient: async ({ clientId }) => {
      await options.invitePaidClient.execute({ clientId });
    },
    recordCoachingStanding: async ({ clientId, standing }) =>
      unitOfWork(() =>
        options.recordCoachingStanding.execute({
          clientId,
          standing: standingOf(standing),
        }),
      ),
  };
}

function standingOf(standing: CoachingStandingDto): CoachingStandingSnapshot {
  return {
    status: standing.status,
    accessEndsAt: dateOrNull(standing.accessEndsAt),
    refundDue: standing.refundDue,
    bundleMonths: standing.bundleMonths,
    programStartsAt: dateOrNull(standing.programStartsAt),
    paidThrough: dateOrNull(standing.paidThrough),
  };
}

function dateOrNull(instant: string | null): Date | null {
  return instant === null ? null : new Date(instant);
}
