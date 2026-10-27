import type {
  CoachAvailability,
  CoachAvailabilityProblem,
  Weekday,
} from "../coach-availability";
import type { CoachMeetingRoom } from "../coach-meeting-room";

export type CoachScheduleSettingsSnapshot = {
  timeZone: string;
  weekdays: readonly Weekday[];
  startHour: number;
  endHour: number;
  meetingLink: string | null;
};

export type CoachScheduleSettingsProblem =
  CoachAvailabilityProblem | "invalid_meeting_link";

export function coachScheduleSettingsOf(
  availability: CoachAvailability,
  room: CoachMeetingRoom | null,
): CoachScheduleSettingsSnapshot {
  return {
    timeZone: availability.timeZone,
    weekdays: availability.weekdays,
    startHour: availability.startHour,
    endHour: availability.endHour,
    meetingLink: room ? room.url : null,
  };
}
