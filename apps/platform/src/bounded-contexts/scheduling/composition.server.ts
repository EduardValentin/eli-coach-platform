import type { MiddlewareFunction } from "react-router";

import {
  coachScheduleContext,
  type CoachScheduleFeature,
} from "~/bounded-contexts/scheduling/coach-schedule/adapters/inbound/http/context.server";
import { composeCoachScheduleFeature } from "~/bounded-contexts/scheduling/coach-schedule/composition.server";
import {
  assessmentCallsContext,
  type AssessmentCallsFeature,
} from "~/bounded-contexts/scheduling/assessment-calls/adapters/inbound/http/context.server";
import {
  composeAssessmentCallsFeature,
  type AssessmentCallsFeatureHandles,
} from "~/bounded-contexts/scheduling/assessment-calls/composition.server";

type CoachScheduleHandles = ReturnType<
  typeof composeCoachScheduleFeature
>["handles"];
type AssessmentCallsHandles = ReturnType<
  typeof composeAssessmentCallsFeature
>["handles"];

export type SchedulingHandles = Parameters<
  typeof composeCoachScheduleFeature
>[0] &
  Omit<AssessmentCallsFeatureHandles, keyof CoachScheduleHandles>;

export type SchedulingComposition = {
  components: {
    assessmentCalls: AssessmentCallsFeature;
    coachSchedule: CoachScheduleFeature;
  };
  handles: CoachScheduleHandles & AssessmentCallsHandles;
  middleware: MiddlewareFunction<Response>;
};

export function composeScheduling(
  handles: SchedulingHandles,
): SchedulingComposition {
  const coachSchedule = composeCoachScheduleFeature(handles);
  const assessmentCalls = composeAssessmentCallsFeature({
    ...handles,
    availability: coachSchedule.handles.availability,
    calendar: coachSchedule.handles.calendar,
    coachTime: coachSchedule.handles.coachTime,
    meetingRoom: coachSchedule.handles.meetingRoom,
  });

  return {
    components: {
      assessmentCalls: assessmentCalls.feature,
      coachSchedule: coachSchedule.feature,
    },
    handles: { ...coachSchedule.handles, ...assessmentCalls.handles },
    middleware: ({ context }, next) => {
      context.set(coachScheduleContext, coachSchedule.feature);
      context.set(assessmentCallsContext, assessmentCalls.feature);
      return next();
    },
  };
}
