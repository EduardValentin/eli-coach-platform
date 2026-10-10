import { describe, expect, it, vi } from "vitest";

import type { CoachScheduleFeature } from "~/features/coach-schedule/server/coach-schedule-composition.server";
import { coachScheduleContext } from "~/features/coach-schedule/server/guards/coach-schedule-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./settings-page";

const SETTINGS = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
  meetingLink: null,
};

describe("coach settings page loader", () => {
  it("loads the coach's saved coach schedule settings", async () => {
    // arrange
    const loadSettingsPage = vi.fn().mockResolvedValue(SETTINGS);
    const feature = {
      coachScheduleSettings: { loadSettingsPage },
    } as unknown as CoachScheduleFeature;

    // act
    const settings = await loader(
      createRequestArgs({
        contexts: [contextEntry(coachScheduleContext, feature)],
        request: new Request("http://localhost/coach/settings"),
      }),
    );

    // assert
    expect(settings).toEqual(SETTINGS);
    expect(loadSettingsPage).toHaveBeenCalledOnce();
  });
});
