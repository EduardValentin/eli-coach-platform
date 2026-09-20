import type {
  CoachAvailability,
  CoachAvailabilityProblem,
  Weekday,
} from "../coach-availability";
import type { CoachMeetingRoom } from "../coach-meeting-room";

export type AssessmentCallSettingsSnapshot = {
  timeZone: string;
  weekdays: readonly Weekday[];
  startHour: number;
  endHour: number;
  meetingLink: string | null;
};

export type AssessmentCallSettingsProblem =
  CoachAvailabilityProblem | "invalid_meeting_link";

export function assessmentCallSettingsOf(
  availability: CoachAvailability,
  room: CoachMeetingRoom | null,
): AssessmentCallSettingsSnapshot {
  return {
    timeZone: availability.timeZone,
    weekdays: availability.weekdays,
    startHour: availability.startHour,
    endHour: availability.endHour,
    meetingLink: room ? room.url : null,
  };
}
