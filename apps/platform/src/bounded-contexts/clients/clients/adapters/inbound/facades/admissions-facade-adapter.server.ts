import type {
  AdmitPaidClientUseCase,
  CoachingStandingSnapshot,
  RecordCoachingStandingUseCase,
} from "~/bounded-contexts/clients/clients/domain/client";
import type { InvitePaidClientUseCase } from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type {
  AdmissionsFacade,
  CoachingStandingDto,
  PaidClientDto,
  CoachingStandingRecordDto,
} from "~/bounded-contexts/clients/public/admissions-facade";
import type { UnitOfWork } from "~/shared/http/unit-of-work";

type AdmissionsFacadeOptions = {
  admitPaidClientUseCase: AdmitPaidClientUseCase;
  invitePaidClientUseCase: InvitePaidClientUseCase;
  recordCoachingStandingUseCase: RecordCoachingStandingUseCase;
  unitOfWork: UnitOfWork;
};

export class AdmissionsFacadeAdapter implements AdmissionsFacade {
  constructor(private readonly options: AdmissionsFacadeOptions) {}

  async admitPaidClient({ admittedAt, standing, ...intake }: PaidClientDto) {
    return this.options.unitOfWork(() =>
      this.options.admitPaidClientUseCase.execute({
        intake,
        at: new Date(admittedAt),
        standing: this.standingOf(standing),
      }),
    );
  }

  async invitePaidClient({ clientId }: { clientId: string }) {
    await this.options.invitePaidClientUseCase.execute({ clientId });
  }

  async recordCoachingStanding({
    clientId,
    standing,
  }: CoachingStandingRecordDto) {
    return this.options.unitOfWork(() =>
      this.options.recordCoachingStandingUseCase.execute({
        clientId,
        standing: this.standingOf(standing),
      }),
    );
  }

  private standingOf(standing: CoachingStandingDto): CoachingStandingSnapshot {
    return {
      status: standing.status,
      accessEndsAt: this.dateOrNull(standing.accessEndsAt),
      refundDue: standing.refundDue,
      bundleMonths: standing.bundleMonths,
      programStartsAt: this.dateOrNull(standing.programStartsAt),
      paidThrough: this.dateOrNull(standing.paidThrough),
    };
  }

  private dateOrNull(instant: string | null): Date | null {
    return instant === null ? null : new Date(instant);
  }
}
