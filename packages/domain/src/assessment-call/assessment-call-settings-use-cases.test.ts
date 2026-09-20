import { describe, expect, it, vi } from "vitest";

import {
  CoachAvailability,
  type CoachAvailabilityChanges,
  type CoachAvailabilityProps,
  type CoachAvailabilitySource,
} from "../coach-availability";
import {
  CoachMeetingRoom,
  type CoachMeetingRoomChanges,
  type CoachMeetingRoomSource,
} from "../coach-meeting-room";

import type { AssessmentCallSettingsSnapshot } from "./assessment-call-settings";
import { GetAssessmentCallSettingsUseCase } from "./get-assessment-call-settings-use-case";
import { UpdateAssessmentCallSettingsUseCase } from "./update-assessment-call-settings-use-case";

const CONFIGURED_AVAILABILITY = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
} satisfies CoachAvailabilityProps;

function configuredAvailabilityOrThrow(
  props: CoachAvailabilityProps,
): CoachAvailability {
  const result = CoachAvailability.from(props);

  if (result.status !== "configured") {
    throw new Error(
      `Expected a configured availability, got problems: ${result.problems.join(", ")}`,
    );
  }

  return result.availability;
}

function configuredRoom(url: string): CoachMeetingRoom {
  const result = CoachMeetingRoom.from(url);

  if (result.status !== "set") {
    throw new Error(`Expected a set room, got ${result.status}`);
  }

  return result.room;
}

function createAvailabilitySource(
  options?: Partial<CoachAvailabilitySource>,
): CoachAvailabilitySource {
  return {
    current: vi
      .fn()
      .mockResolvedValue(
        configuredAvailabilityOrThrow(CONFIGURED_AVAILABILITY),
      ),
    ...options,
  };
}

function createAvailabilityChanges(
  options?: Partial<CoachAvailabilityChanges>,
): CoachAvailabilityChanges {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    ...options,
  };
}

function createMeetingRoomSource(
  options?: Partial<CoachMeetingRoomSource>,
): CoachMeetingRoomSource {
  return {
    current: vi.fn().mockResolvedValue(null),
    ...options,
  };
}

function createMeetingRoomChanges(
  options?: Partial<CoachMeetingRoomChanges>,
): CoachMeetingRoomChanges {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    ...options,
  };
}

describe("GetAssessmentCallSettingsUseCase", () => {
  it("composes the availability and the meeting room into one snapshot", async () => {
    // arrange
    const getSettings = new GetAssessmentCallSettingsUseCase({
      availability: createAvailabilitySource(),
      meetingRoom: createMeetingRoomSource({
        current: vi
          .fn()
          .mockResolvedValue(configuredRoom("https://meet.example.com/room")),
      }),
    });

    // act
    const settings = await getSettings.execute();

    // assert
    expect(settings).toEqual({
      timeZone: "Europe/Bucharest",
      weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startHour: 17,
      endHour: 20,
      meetingLink: "https://meet.example.com/room",
    });
  });

  it("answers no meeting link while the coach has saved no room", async () => {
    // arrange
    const getSettings = new GetAssessmentCallSettingsUseCase({
      availability: createAvailabilitySource(),
      meetingRoom: createMeetingRoomSource(),
    });

    // act
    const settings = await getSettings.execute();

    // assert
    expect(settings.meetingLink).toBeNull();
  });
});

describe("UpdateAssessmentCallSettingsUseCase", () => {
  const validCommand = {
    timeZone: "Europe/Bucharest",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    startHour: 9,
    endHour: 12,
    meetingLink: "https://meet.example.com/room",
  } satisfies AssessmentCallSettingsSnapshot;

  it("saves the availability and then the room when both are valid", async () => {
    // arrange
    const availabilityChanges = createAvailabilityChanges();
    const meetingRoomChanges = createMeetingRoomChanges();
    const updateSettings = new UpdateAssessmentCallSettingsUseCase({
      availabilityChanges,
      meetingRoomChanges,
    });

    // act
    const result = await updateSettings.execute(validCommand);

    // assert
    expect(result).toEqual({ status: "saved", settings: validCommand });
    expect(availabilityChanges.save).toHaveBeenCalledWith(
      expect.objectContaining({
        timeZone: "Europe/Bucharest",
        startHour: 9,
        endHour: 12,
      }),
    );
    expect(meetingRoomChanges.save).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://meet.example.com/room" }),
    );

    const savedAvailability = availabilityChanges.save as ReturnType<
      typeof vi.fn
    >;
    const savedRoom = meetingRoomChanges.save as ReturnType<typeof vi.fn>;

    expect(savedAvailability.mock.invocationCallOrder[0]).toBeLessThan(
      savedRoom.mock.invocationCallOrder[0]!,
    );
  });

  it("saves an empty meeting link as no room", async () => {
    // arrange
    const meetingRoomChanges = createMeetingRoomChanges();
    const updateSettings = new UpdateAssessmentCallSettingsUseCase({
      availabilityChanges: createAvailabilityChanges(),
      meetingRoomChanges,
    });

    // act
    const result = await updateSettings.execute({
      ...validCommand,
      meetingLink: "",
    });

    // assert
    expect(result).toEqual({
      status: "saved",
      settings: { ...validCommand, meetingLink: null },
    });
    expect(meetingRoomChanges.save).toHaveBeenCalledWith(null);
  });

  it("refuses without saving anything when no weekday is selected", async () => {
    // arrange
    const availabilityChanges = createAvailabilityChanges();
    const meetingRoomChanges = createMeetingRoomChanges();
    const updateSettings = new UpdateAssessmentCallSettingsUseCase({
      availabilityChanges,
      meetingRoomChanges,
    });

    // act
    const result = await updateSettings.execute({
      ...validCommand,
      weekdays: [],
    });

    // assert
    expect(result).toEqual({ status: "invalid", problems: ["no_weekday"] });
    expect(availabilityChanges.save).not.toHaveBeenCalled();
    expect(meetingRoomChanges.save).not.toHaveBeenCalled();
  });

  it("refuses without saving anything for an invalid meeting link", async () => {
    // arrange
    const availabilityChanges = createAvailabilityChanges();
    const meetingRoomChanges = createMeetingRoomChanges();
    const updateSettings = new UpdateAssessmentCallSettingsUseCase({
      availabilityChanges,
      meetingRoomChanges,
    });

    // act
    const result = await updateSettings.execute({
      ...validCommand,
      meetingLink: "not-a-url",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: ["invalid_meeting_link"],
    });
    expect(availabilityChanges.save).not.toHaveBeenCalled();
    expect(meetingRoomChanges.save).not.toHaveBeenCalled();
  });

  it("collects every problem when the availability and the link are both invalid", async () => {
    // arrange
    const updateSettings = new UpdateAssessmentCallSettingsUseCase({
      availabilityChanges: createAvailabilityChanges(),
      meetingRoomChanges: createMeetingRoomChanges(),
    });

    // act
    const result = await updateSettings.execute({
      ...validCommand,
      weekdays: [],
      meetingLink: "not-a-url",
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: ["no_weekday", "invalid_meeting_link"],
    });
  });
});
