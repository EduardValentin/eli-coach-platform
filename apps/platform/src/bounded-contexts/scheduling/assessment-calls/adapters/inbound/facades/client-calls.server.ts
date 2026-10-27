import type { AssessmentCallReservations } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { ClientCallsFacade } from "~/bounded-contexts/scheduling/public/client-calls";

import { visitorOf } from "./visitor.server";

export function createClientCallsFacade(
  calls: Pick<AssessmentCallReservations, "findById">,
): ClientCallsFacade {
  return {
    callOf: async (callId) => {
      const call = await calls.findById(callId);

      return call
        ? {
            id: call.id,
            startsAt: call.startsAt.toISOString(),
            coachTimeZone: call.coachTimeZone,
            visitor: visitorOf(call),
          }
        : null;
    },
  };
}
