import type { AssessmentCallReservationsPort } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls-facade";

import { visitorOf } from "./visitor.server";

export class EndedCallsFacadeAdapter implements EndedCallsFacade {
  constructor(
    private readonly calls: Pick<AssessmentCallReservationsPort, "findById">,
  ) {}

  async callOf(callId: string) {
    const call = await this.calls.findById(callId);

    return call
      ? {
          id: call.id,
          startsAt: call.startsAt.toISOString(),
          endsAt: call.endsAt().toISOString(),
          visitor: visitorOf(call),
        }
      : null;
  }
}
