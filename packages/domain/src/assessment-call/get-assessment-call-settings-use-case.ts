import type { CoachAvailabilitySource } from "../coach-availability";
import type { CoachMeetingRoomSource } from "../coach-meeting-room";

import {
  assessmentCallSettingsOf,
  type AssessmentCallSettingsSnapshot,
} from "./assessment-call-settings";

type GetAssessmentCallSettingsUseCaseOptions = {
  availability: CoachAvailabilitySource;
  meetingRoom: CoachMeetingRoomSource;
};

export class GetAssessmentCallSettingsUseCase {
  constructor(
    private readonly options: GetAssessmentCallSettingsUseCaseOptions,
  ) {}

  async execute(): Promise<AssessmentCallSettingsSnapshot> {
    const [availability, room] = await Promise.all([
      this.options.availability.current(),
      this.options.meetingRoom.current(),
    ]);

    return assessmentCallSettingsOf(availability, room);
  }
}
