import { describe, expect, it, vi } from "vitest";

import type { ClientProfileFeature } from "~/features/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import type { ClientSettingsView } from "~/features/client-profile/public/client-settings";
import type { OwnClientProfileView } from "~/features/client-profile/public/own-client-profile";
import type { ClientSettings } from "~/features/coaching-sales/public/client-subscription";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./settings";

const SUBSCRIPTION: ClientSettings = {
  subscription: {
    bundleId: "3-months",
    months: 3,
    amountCents: 44_700,
    currency: "eur",
    paidAt: "2026-09-28T09:00:00.000Z",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblem: false,
  },
  cancellation: null,
  startNowUntil: null,
  card: { brand: "visa", lastFour: "4242", expiryMonth: 12, expiryYear: 2034 },
};

const CLIENT_SETTINGS: ClientSettingsView = {
  units: { weightUnit: "kg", heightUnit: "cm" },
  preferredCheckInWeekday: "monday",
  preferredChannel: "email",
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

describe("settings page route", () => {
  it("loads her subscription from coaching sales and her settings and profile from her client profile", async () => {
    // arrange
    const subscription = {
      loadSettings: vi.fn().mockResolvedValue(SUBSCRIPTION),
    };
    const clientSettings = { load: vi.fn().mockResolvedValue(CLIENT_SETTINGS) };
    const ownProfile = { load: vi.fn().mockResolvedValue(OWN_PROFILE) };
    const args = createRequestArgs({
      contexts: [
        contextEntry(coachingSalesContext, {
          subscription,
        } as unknown as CoachingSalesFeature),
        contextEntry(clientProfileContext, {
          clientSettings,
          ownProfile,
        } as unknown as ClientProfileFeature),
      ],
      request: new Request("https://evoa.fit/client/settings"),
    });

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      clientSettings: CLIENT_SETTINGS,
      profile: OWN_PROFILE,
      subscription: SUBSCRIPTION,
    });
    expect(subscription.loadSettings).toHaveBeenCalledWith(args);
    expect(clientSettings.load).toHaveBeenCalledWith(args);
    expect(ownProfile.load).toHaveBeenCalledWith(args);
  });

  it("titles the page as the client portal's settings", () => {
    // arrange
    const describePage = meta;

    // act
    const tags = describePage({} as Parameters<typeof meta>[0]);

    // assert
    expect(tags).toEqual(
      expect.arrayContaining([{ title: "Settings | Evoa" }]),
    );
  });
});
