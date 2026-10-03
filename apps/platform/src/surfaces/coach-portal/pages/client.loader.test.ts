import { describe, expect, it, vi } from "vitest";

import type { OnboardingReviewView } from "~/features/client-onboarding/contracts/onboarding-review";
import type { ClientOnboardingFeature } from "~/features/client-onboarding/server/client-onboarding-composition.server";
import { clientOnboardingContext } from "~/features/client-onboarding/server/guards/client-onboarding-context.server";
import type { ClientProfileView } from "~/features/client-profile/contracts/client-profile";
import type { MeasurementRow } from "~/features/client-profile/contracts/measurements";
import type { ClientProfileFeature } from "~/features/client-profile/server/client-profile-composition.server";
import { clientProfileContext } from "~/features/client-profile/server/guards/client-profile-context.server";
import type { CoachClient } from "~/features/coaching-sales/contracts/coach-clients";
import type { CoachingSalesFeature } from "~/features/coaching-sales/server/coaching-sales-composition.server";
import { coachingSalesContext } from "~/features/coaching-sales/server/guards/coaching-sales-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { loader, meta } from "./client";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "ana@example.com",
  firstName: "Ana",
  invitation: null,
  lastName: "Popescu",
  needsRefund: false,
  coachingClosed: false,
  assessmentCall: {
    startsAt: "2026-09-18T12:00:00.000Z",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
    primaryGoal: "build_strength",
    notes: null,
  },
  gender: "female",
  status: "onboarding",
  subscription: null,
};

const REVIEW: OnboardingReviewView = {
  clientId: CLIENT_ID,
  submittedWaistCm: null,
  statedHeightCm: null,
  submitted: null,
};

const MEASUREMENTS: MeasurementRow[] = [
  {
    id: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
    recordedAt: "2026-09-29T09:00:00.000Z",
    weightKg: 64.5,
    waistCm: 72,
    hipsCm: null,
    thighCm: null,
    armCm: null,
    photos: [],
  },
];

const PROFILE: ClientProfileView = {
  identity: {
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
  },
  facts: {
    heightCm: 168,
    activityLevel: "Lightly active",
    primaryGoal: "Lose fat",
    dietaryRestrictions: "None",
    clientNotes: null,
  },
  startingWeightKg: 64.5,
  currentWeightKg: 64.5,
};

describe("coach client page loader", () => {
  it("reads her record, her onboarding review, her profile and her measurements for this request, side by side", async () => {
    // arrange
    const { args, loadClient, loadMeasurements, loadProfile, loadReview } =
      routeArguments();

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      client: CLIENT,
      review: REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS,
    });
    expect(loadClient).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadReview).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadProfile).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadMeasurements).toHaveBeenCalledWith(args, CLIENT_ID);
  });

  it("reads her identity alone as her profile before she has sent her onboarding", async () => {
    // arrange
    const { args, loadProfile } = routeArguments();
    const awaiting: ClientProfileView = {
      identity: PROFILE.identity,
      facts: null,
      startingWeightKg: null,
      currentWeightKg: null,
    };
    loadProfile.mockResolvedValue(awaiting);

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded.profile).toEqual(awaiting);
  });

  it("leaves the 404 an unknown client raises alone", async () => {
    // arrange
    const { args, loadClient } = routeArguments();
    loadClient.mockRejectedValue(new Response("Not Found", { status: 404 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });

  it("leaves the denial the portal guard raises alone", async () => {
    // arrange
    const { args, loadReview } = routeArguments();
    loadReview.mockRejectedValue(new Response("Forbidden", { status: 403 }));

    // act
    const loading = loader(args);

    // assert
    await expect(loading).rejects.toMatchObject({ status: 403 });
  });
});

describe("coach client page meta", () => {
  it("titles the page with her full name", () => {
    // arrange
    const data = {
      client: CLIENT,
      review: REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS,
    };

    // act
    const descriptors = meta({ data } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Ana Popescu | Evoa" }]);
  });
});

function routeArguments() {
  const loadClient = vi.fn().mockResolvedValue(CLIENT);
  const loadReview = vi.fn().mockResolvedValue(REVIEW);
  const loadProfile = vi.fn().mockResolvedValue(PROFILE);
  const loadMeasurements = vi.fn().mockResolvedValue(MEASUREMENTS);
  const args = createRequestArgs({
    contexts: [
      contextEntry(coachingSalesContext, {
        coachClients: { loadClient },
      } as unknown as CoachingSalesFeature),
      contextEntry(clientOnboardingContext, {
        coachReview: { loadReview },
      } as unknown as ClientOnboardingFeature),
      contextEntry(clientProfileContext, {
        coachProfile: { load: loadProfile, loadMeasurements },
      } as unknown as ClientProfileFeature),
    ],
    params: { clientId: CLIENT_ID },
    request: new Request(`http://localhost/coach/clients/${CLIENT_ID}`),
  });

  return { args, loadClient, loadMeasurements, loadProfile, loadReview };
}
