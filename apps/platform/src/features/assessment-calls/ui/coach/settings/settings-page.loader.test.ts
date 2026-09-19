import { describe, expect, it, vi } from "vitest";

import type { AssessmentCallsFeature } from "~/features/assessment-calls/server/assessment-calls-composition.server";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";
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
  it("loads the coach's saved assessment call settings", async () => {
    // arrange
    const loadSettingsPage = vi.fn().mockResolvedValue(SETTINGS);
    const feature = {
      assessmentCallSettings: { loadSettingsPage },
    } as unknown as AssessmentCallsFeature;

    // act
    const settings = await loader(
      createRequestArgs({
        contexts: [contextEntry(assessmentCallsContext, feature)],
        request: new Request("http://localhost/coach/settings"),
      }),
    );

    // assert
    expect(settings).toEqual(SETTINGS);
    expect(loadSettingsPage).toHaveBeenCalledOnce();
  });
});
