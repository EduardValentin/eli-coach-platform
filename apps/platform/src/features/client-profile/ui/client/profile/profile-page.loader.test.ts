import { describe, expect, it, vi } from "vitest";

import type { MeasurementsPage } from "~/features/client-profile/public/measurements";
import type { ClientProfileFeature } from "~/features/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader } from "./profile-page";

const MEASUREMENTS_PAGE: MeasurementsPage = {
  history: [
    {
      id: "8a7b6c5d-4e3f-4a1b-9c8d-7e6f5a4b3c2d",
      recordedAt: "2026-09-29T08:00:00.000Z",
      weightKg: 66.1,
      waistCm: 74,
      hipsCm: null,
      thighCm: null,
      armCm: null,
      photos: [],
    },
  ],
  consentedAt: null,
  units: { weightUnit: "kg", heightUnit: "cm" },
  dueLine: null,
};

describe("client profile loader", () => {
  it("loads her measurements page from her profile", async () => {
    // arrange
    const loadPage = vi.fn().mockResolvedValue(MEASUREMENTS_PAGE);
    const args = createRequestArgs({
      contexts: [
        contextEntry(clientProfileContext, {
          clientMeasurements: { loadPage },
        } as unknown as ClientProfileFeature),
      ],
      request: new Request("https://evoa.fit/client/profile"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual(MEASUREMENTS_PAGE);
    expect(loadPage).toHaveBeenCalledWith(args);
  });
});
