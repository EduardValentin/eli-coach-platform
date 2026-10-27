import type { AssessmentCallReservations } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { EndedCallsFacade } from "~/bounded-contexts/scheduling/public/ended-calls";

import { visitorOf } from "./visitor.server";

export function createEndedCallsFacade(
  calls: Pick<AssessmentCallReservations, "findById">,
): EndedCallsFacade {
  return {
    endedCall: async (callId) => {
      const call = await calls.findById(callId);

      return call
        ? {
            id: call.id,
            startsAt: call.startsAt.toISOString(),
            endsAt: call.endsAt().toISOString(),
            visitor: visitorOf(call),
          }
        : null;
    },
  };
}
