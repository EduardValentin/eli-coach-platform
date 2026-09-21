import type {
  AssessmentCallSnapshot,
  ListAssessmentCallsUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import type { Clock } from "@eli-coach-platform/domain/shared";

import {
  coachAssessmentCallsSchema,
  COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
  COACH_ASSESSMENT_CALLS_UNAVAILABLE_STATUS,
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
    const listing = await this.options.listAssessmentCalls.execute();

    if (listing.status === "unavailable") {
      throw new Response(COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE, {
        status: COACH_ASSESSMENT_CALLS_UNAVAILABLE_STATUS,
      });
    }

    return coachAssessmentCallsSchema.parse({
      calls: listing.calls.map(serialiseCall),
      coachTimeZone: listing.coachTimeZone,
      now: this.options.clock.now().toISOString(),
    });
  }
}

function serialiseCall(call: AssessmentCallSnapshot): CoachAssessmentCall {
  return {
    id: call.id,
    firstName: call.firstName,
    lastName: call.lastName,
    fullName: call.fullName,
    visitorEmail: call.visitorEmail,
    visitorNotes: call.visitorNotes,
    dateOfBirth: call.dateOfBirth,
    gender: call.gender,
    primaryGoal: call.primaryGoal,
    country: call.country,
    phone: call.phone,
    startsAt: call.startsAt.toISOString(),
    endsAt: call.endsAt.toISOString(),
    joinPath: assessmentCallJoinPath(call.id),
  };
}
