import type {
  CoachingStanding,
  CoachingStandingWriter,
} from "~/bounded-contexts/sales/coaching-sales/domain/coaching-subscription";
import type { AdmissionsFacade } from "~/bounded-contexts/clients/public/admissions";

import { coachingStandingDtoOf } from "./coaching-standing-dto.server";

export class ClientsCoachingStandingWriter implements CoachingStandingWriter {
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
