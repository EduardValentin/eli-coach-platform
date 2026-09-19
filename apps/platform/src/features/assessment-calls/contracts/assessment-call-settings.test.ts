import { WEEKDAYS } from "@eli-coach-platform/domain/coach-availability";
import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_CALL_SETTINGS_MESSAGES,
  ASSESSMENT_CALL_SETTINGS_TOASTS,
  HOUR_OPTIONS,
  WEEKDAY_DISPLAY_ORDER,
  assessmentCallSettingsSchema,
  updateAssessmentCallSettingsErrorSchema,
  updateAssessmentCallSettingsSuccessSchema,
} from "./assessment-call-settings";

const VALID_SETTINGS = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
  meetingLink: null,
};

describe("assessmentCallSettingsSchema", () => {
  it("accepts the coach's saved window with no meeting link", () => {
    // arrange
    // act
    const result = assessmentCallSettingsSchema.safeParse(VALID_SETTINGS);

    // assert
    expect(result.success).toBe(true);
    expect(result.data).toEqual(VALID_SETTINGS);
  });

  it("accepts an https meeting link", () => {
    // arrange
    const settings = {
      ...VALID_SETTINGS,
      meetingLink: "https://meet.google.com/abc-defg-hij",
    };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(true);
  });

  it("accepts an empty meeting link string", () => {
    // arrange
    const settings = { ...VALID_SETTINGS, meetingLink: "" };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects an empty weekday list", () => {
    // arrange
    const settings = { ...VALID_SETTINGS, weekdays: [] };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["weekdays"]);
  });

  it("rejects a weekday the domain does not recognise", () => {
    // arrange
    const settings = { ...VALID_SETTINGS, weekdays: ["someday"] };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["weekdays", 0]);
  });

  it("accepts every domain weekday", () => {
    // arrange
    const settings = { ...VALID_SETTINGS, weekdays: [...WEEKDAYS] };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(true);
  });

  it.each([-1, 24, 1.5])(
    "rejects a start hour of %s outside 0 to 23",
    (startHour) => {
      // arrange
      const settings = { ...VALID_SETTINGS, startHour };

      // act
      const result = assessmentCallSettingsSchema.safeParse(settings);

      // assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["startHour"]);
    },
  );

  it.each([0, 25, 1.5])(
    "rejects an end hour of %s outside 1 to 24",
    (endHour) => {
      // arrange
      const settings = { ...VALID_SETTINGS, endHour };

      // act
      const result = assessmentCallSettingsSchema.safeParse(settings);

      // assert
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["endHour"]);
    },
  );

  it("rejects a meeting link that is not https", () => {
    // arrange
    const settings = {
      ...VALID_SETTINGS,
      meetingLink: "http://meet.google.com/abc-defg-hij",
    };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["meetingLink"]);
  });

  it("rejects a meeting link longer than 2048 characters", () => {
    // arrange
    const settings = {
      ...VALID_SETTINGS,
      meetingLink: `https://meet.example/${"a".repeat(2048)}`,
    };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["meetingLink"]);
  });

  it("rejects a time zone the runtime does not know", () => {
    // arrange
    const settings = { ...VALID_SETTINGS, timeZone: "Mars/Olympus_Mons" };

    // act
    const result = assessmentCallSettingsSchema.safeParse(settings);

    // assert
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["timeZone"]);
  });
});

describe("updateAssessmentCallSettingsSuccessSchema", () => {
  it("publishes the saved settings", () => {
    // arrange
    const response = { success: true, settings: VALID_SETTINGS };

    // act
    const result =
      updateAssessmentCallSettingsSuccessSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });
});

describe("updateAssessmentCallSettingsErrorSchema", () => {
  it.each([
    "no_weekday",
    "invalid_hours",
    "invalid_meeting_link",
    "invalid_time_zone",
    "server_error",
  ] as const)("accepts %s as a settings error outcome", (code) => {
    // arrange
    const response = { success: false, error: { code, message: "opaque" } };

    // act
    const result = updateAssessmentCallSettingsErrorSchema.safeParse(response);

    // assert
    expect(result.success).toBe(true);
  });

  it("rejects an unknown error code", () => {
    // arrange
    const response = {
      success: false,
      error: { code: "unknown_problem", message: "opaque" },
    };

    // act
    const result = updateAssessmentCallSettingsErrorSchema.safeParse(response);

    // assert
    expect(result.success).toBe(false);
  });
});

describe("ASSESSMENT_CALL_SETTINGS_MESSAGES", () => {
  it("words each save problem the coach can cause", () => {
    // arrange
    // act
    // assert
    expect(ASSESSMENT_CALL_SETTINGS_MESSAGES).toEqual({
      no_weekday: "Pick at least one day.",
      invalid_hours: "The start hour must be before the end hour.",
      invalid_meeting_link: "Enter a full https:// link, or leave it empty.",
      invalid_time_zone: "Your browser's time zone could not be read.",
      server_error: "We couldn't save your settings. Try again in a moment.",
    });
  });
});

describe("ASSESSMENT_CALL_SETTINGS_TOASTS", () => {
  it("words the save outcomes, reusing the server error for a failed save", () => {
    // arrange
    // act
    // assert
    expect(ASSESSMENT_CALL_SETTINGS_TOASTS).toEqual({
      saved: "Settings saved",
      failed: ASSESSMENT_CALL_SETTINGS_MESSAGES.server_error,
    });
  });
});

describe("WEEKDAY_DISPLAY_ORDER", () => {
  it("lists every domain weekday starting on Monday", () => {
    // arrange
    // act
    // assert
    expect(WEEKDAY_DISPLAY_ORDER).toEqual([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]);
    expect([...WEEKDAY_DISPLAY_ORDER].sort()).toEqual([...WEEKDAYS].sort());
  });
});

describe("HOUR_OPTIONS", () => {
  it("offers 00:00 through 23:00 for the start select", () => {
    // arrange
    // act
    // assert
    expect(HOUR_OPTIONS.start).toHaveLength(24);
    expect(HOUR_OPTIONS.start[0]).toEqual({ value: 0, label: "00:00" });
    expect(HOUR_OPTIONS.start.at(-1)).toEqual({ value: 23, label: "23:00" });
  });

  it("offers 01:00 through 24:00 for the end select", () => {
    // arrange
    // act
    // assert
    expect(HOUR_OPTIONS.end).toHaveLength(24);
    expect(HOUR_OPTIONS.end[0]).toEqual({ value: 1, label: "01:00" });
    expect(HOUR_OPTIONS.end.at(-1)).toEqual({ value: 24, label: "24:00" });
  });
});
