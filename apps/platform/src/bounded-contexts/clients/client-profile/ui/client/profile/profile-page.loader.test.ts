import { describe, expect, it, vi } from "vitest";

import type { MeasurementsPage } from "~/bounded-contexts/clients/client-profile/public/measurements";
import type { OwnClientProfileView } from "~/bounded-contexts/clients/client-profile/public/own-client-profile";
import type { ClientProfileFeature } from "~/bounded-contexts/clients/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/bounded-contexts/clients/client-profile/server/guards/client-profile-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

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

const OWN_PROFILE: OwnClientProfileView = {
  identity: {
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: "+40712345678",
  },
  coaching: null,
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarUrl: null,
  startingWeightKg: 66.1,
  currentWeightKg: 66.1,
};

describe("client profile loader", () => {
  it("loads her own profile beside her measurements page", async () => {
    // arrange
    const loadPage = vi.fn().mockResolvedValue(MEASUREMENTS_PAGE);
    const load = vi.fn().mockResolvedValue(OWN_PROFILE);
    const args = createRequestArgs({
      contexts: [
        contextEntry(clientProfileContext, {
          clientMeasurements: { loadPage },
          ownProfile: { load },
        } as unknown as ClientProfileFeature),
      ],
      request: new Request("https://evoa.fit/client/profile"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      measurements: MEASUREMENTS_PAGE,
      profile: OWN_PROFILE,
    });
    expect(loadPage).toHaveBeenCalledWith(args);
    expect(load).toHaveBeenCalledWith(args);
  });
});
