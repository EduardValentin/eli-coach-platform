import {
  CoachAvailability,
  type CoachAvailabilityChanges,
} from "../coach-availability";
import {
  CoachMeetingRoom,
  type CoachMeetingRoomChanges,
} from "../coach-meeting-room";

import {
  assessmentCallSettingsOf,
  type AssessmentCallSettingsProblem,
  type AssessmentCallSettingsSnapshot,
} from "./assessment-call-settings";

export type UpdateAssessmentCallSettingsResult =
  | { status: "saved"; settings: AssessmentCallSettingsSnapshot }
  | { status: "invalid"; problems: AssessmentCallSettingsProblem[] };

type UpdateAssessmentCallSettingsUseCaseOptions = {
  availabilityChanges: CoachAvailabilityChanges;
  meetingRoomChanges: CoachMeetingRoomChanges;
};

export class UpdateAssessmentCallSettingsUseCase {
  constructor(
    private readonly options: UpdateAssessmentCallSettingsUseCaseOptions,
  ) {}

  async execute(
    command: AssessmentCallSettingsSnapshot,
  ): Promise<UpdateAssessmentCallSettingsResult> {
    const availabilityResult = CoachAvailability.from(command);
    const roomResult = CoachMeetingRoom.from(command.meetingLink);

    if (
      availabilityResult.status === "invalid" ||
      roomResult.status === "invalid"
    ) {
      return {
        status: "invalid",
        problems: [
          ...(availabilityResult.status === "invalid"
            ? availabilityResult.problems
            : []),
          ...(roomResult.status === "invalid"
            ? (["invalid_meeting_link"] as const)
            : []),
        ],
      };
    }

    await this.options.availabilityChanges.save(
      availabilityResult.availability,
    );

    const room = roomResult.status === "set" ? roomResult.room : null;

    await this.options.meetingRoomChanges.save(room);

    return {
      status: "saved",
      settings: assessmentCallSettingsOf(availabilityResult.availability, room),
    };
  }
}
