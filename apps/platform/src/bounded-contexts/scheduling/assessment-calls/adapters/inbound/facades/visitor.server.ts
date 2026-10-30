import type { AssessmentCall } from "~/bounded-contexts/scheduling/assessment-calls/domain/assessment-call";
import type { Visitor } from "~/bounded-contexts/scheduling/public/visitor";

export function visitorOf(call: AssessmentCall): Visitor {
  return {
    firstName: call.firstName,
    lastName: call.lastName,
    fullName: call.fullName(),
    email: call.visitorEmail,
    notes: call.visitorNotes,
    dateOfBirth: call.dateOfBirth,
    gender: call.gender,
    primaryGoal: call.primaryGoal,
    country: call.country,
    phone: call.phone,
    timeZone: call.visitorTimeZone,
  };
}
