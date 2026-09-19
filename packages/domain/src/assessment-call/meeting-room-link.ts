import type { AssessmentCallSnapshot } from "./assessment-call";

export interface MeetingRoomLink {
  forCall(call: AssessmentCallSnapshot): Promise<string>;
}
