import type { AssessmentCallReservationsPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls-facade";

import { visitorOf } from "./visitor.server";

export class ClientCallsFacadeAdapter implements ClientCallsFacade {
  constructor(
    private readonly assessmentCallReservationsPort: Pick<
      AssessmentCallReservationsPort,
      "findById"
    >,
  ) {}

  async callOf(callId: string) {
    const call = await this.assessmentCallReservationsPort.findById(callId);

    return call
      ? {
          id: call.id,
          startsAt: call.startsAt.toISOString(),
          coachTimeZone: call.coachTimeZone,
          visitor: visitorOf(call),
        }
      : null;
  }
}
