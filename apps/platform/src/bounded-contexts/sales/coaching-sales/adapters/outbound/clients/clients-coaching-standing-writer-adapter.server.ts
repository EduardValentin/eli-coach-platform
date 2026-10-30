import type {
  CoachingStanding,
  CoachingStandingWriterPort,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions-facade";

import { coachingStandingDtoOf } from "./coaching-standing-dto.server";

export class ClientsCoachingStandingWriterAdapter implements CoachingStandingWriterPort {
  constructor(private readonly admissions: AdmissionsFacade) {}

  record(input: {
    clientId: string;
    standing: CoachingStanding;
  }): Promise<void> {
    return this.admissions.recordCoachingStanding({
      clientId: input.clientId,
      standing: coachingStandingDtoOf(input.standing),
    });
  }
}
