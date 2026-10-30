import type {
  CoachingStanding,
  PaidClientAdmissionPort,
  PaidClientAdmissionOutcome,
  PaidClientIntake,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions-facade";
import type { ClientProfileFacade } from "~/bounded-contexts/clients/public/client-profile-facade";

import { coachingStandingDtoOf } from "./coaching-standing-dto.server";

export class ClientsPaidClientAdmissionAdapter implements PaidClientAdmissionPort {
  constructor(
    private readonly admissions: AdmissionsFacade,
    private readonly clientProfile: ClientProfileFacade,
  ) {}

  async admit(admission: {
    client: PaidClientIntake;
    standing: CoachingStanding;
    at: Date;
  }): Promise<PaidClientAdmissionOutcome> {
    const admittedAt = admission.at.toISOString();
    const admitted = await this.admissions.admitPaidClient({
      ...admission.client,
      admittedAt,
      standing: coachingStandingDtoOf(admission.standing),
    });

    if (admitted.status === "admitted") {
      await this.clientProfile.openClientProfile({
        clientId: admitted.clientId,
        openedAt: admittedAt,
      });
    }

    return admitted;
  }

  invite(input: { clientId: string }): Promise<void> {
    return this.admissions.invitePaidClient(input);
  }
}
