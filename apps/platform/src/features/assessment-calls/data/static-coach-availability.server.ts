import {
  CoachAvailability,
  type CoachAvailabilitySource,
} from "@eli-coach-platform/domain/coach-availability";

const COACH_AVAILABILITY = CoachAvailability.configure({
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
});

export class StaticCoachAvailability implements CoachAvailabilitySource {
  readonly timeZone = COACH_AVAILABILITY.timeZone;

  current(): Promise<CoachAvailability> {
    return Promise.resolve(COACH_AVAILABILITY);
  }
}
