import type {
  AssessmentCallListing,
  AssessmentCallSnapshot,
  ListAssessmentCallsUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type { Clock } from "@eli-coach-platform/domain/shared";

import {
  coachAssessmentCallsSchema,
  type CoachAssessmentCall,
  type CoachAssessmentCalls,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { assessmentCallJoinPath } from "~/features/assessment-calls/contracts/paths";

type CoachAssessmentCallsControllerOptions = {
  clock: Clock;
  listAssessmentCalls: ListAssessmentCallsUseCase;
};

export class CoachAssessmentCallsController {
  constructor(
    private readonly options: CoachAssessmentCallsControllerOptions,
  ) {}

  async loadCalls(): Promise<CoachAssessmentCalls> {
    return serialiseListing(
      await this.options.listAssessmentCalls.execute(),
      this.options.clock.now(),
    );
  }
}

function serialiseListing(
  listing: AssessmentCallListing,
  now: Date,
): CoachAssessmentCalls {
  return coachAssessmentCallsSchema.parse({
    calls: listing.calls.map(serialiseCall),
    coachTimeZone: listing.coachTimeZone,
    now: now.toISOString(),
  });
}

function serialiseCall(call: AssessmentCallSnapshot): CoachAssessmentCall {
  return {
    id: call.id,
    visitorName: call.visitorName,
    visitorEmail: call.visitorEmail,
    visitorNotes: call.visitorNotes,
    startsAt: call.startsAt.toISOString(),
    endsAt: call.endsAt.toISOString(),
    joinPath: assessmentCallJoinPath(call.id),
  };
}
