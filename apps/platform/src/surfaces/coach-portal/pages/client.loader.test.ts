import { describe, expect, it, vi } from "vitest";

import type { CoachClientSeriesPanel } from "~/bounded-contexts/clients/check-ins/public/check-ins";
import {
  type CheckInsFeature,
  checkInsContext,
} from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/context.server";
import type { OnboardingReviewView } from "~/bounded-contexts/clients/client-profile/public/onboarding-review";
import {
  type ClientOnboardingFeature,
  clientOnboardingContext,
  type ClientProfileFeature,
  clientProfileContext,
} from "~/bounded-contexts/clients/client-profile/adapters/inbound/http/context.server";
import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";
import type { MeasurementRow } from "~/bounded-contexts/clients/client-profile/public/measurements";
import type { CoachClient } from "~/bounded-contexts/clients/clients/public/coach-clients";
import {
  type ClientsFeature,
  clientsContext,
} from "~/bounded-contexts/clients/clients/adapters/inbound/http/context.server";
import type { ClientSubscription } from "~/bounded-contexts/sales/coaching-sales/public/client-subscription";
import {
  type CoachingSalesFeature,
  coachingSalesContext,
} from "~/bounded-contexts/sales/coaching-sales/adapters/inbound/http/context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { loader, meta } from "./client";

const CLIENT_ID = "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11";

const CLIENT: CoachClient = {
  clientId: CLIENT_ID,
  email: "ana@example.com",
  firstName: "Ana",
  invitation: null,
  lastName: "Popescu",
  needsRefund: false,
  coachingCancelledOrEnded: false,
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
};

const SUBSCRIPTION: ClientSubscription = {
  bundleId: "3-months",
  months: 3,
  reducedPrice: false,
  paidAt: "2026-09-18T13:00:00.000Z",
  workStartsOn: null,
  status: "not-started",
  endsOn: null,
  endedOn: null,
  refund: null,
};

const REVIEW: OnboardingReviewView = {
  clientId: CLIENT_ID,
  submittedWaistCm: null,
  statedHeightCm: null,
  submitted: null,
};

const WEEKLY: CoachClientSeriesPanel = {
  series: {
    id: "5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d",
    weekday: "wednesday",
    hour: 18,
    timeZone: "Europe/Bucharest",
  },
  coachingEnds: false,
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
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
  },
  coaching: {
    heightCm: 168,
    trainingDays: 3,
    sessionMinutes: 60,
    equipment: ["Full gym"],
    trainingPlace: "Gym",
    limitations: "",
    level: "beginner",
    primaryGoal: "Lose fat",
    goalWeightKg: 62,
    activityLevel: "Lightly active",
    cycleMode: "adapted",
    dietaryRestrictions: "None",
  },
  coachNotes: null,
  preferences: { preferredCheckInWeekday: "monday", preferredChannel: "email" },
  avatarUrl: null,
  startingWeightKg: 64.5,
  currentWeightKg: 64.5,
};

describe("coach client page loader", () => {
  it("reads her record, her subscription, her onboarding review, her profile, her measurements, whether a check-in can be scheduled and her weekly check-in for this request, side by side", async () => {
    // arrange
    const {
      args,
      loadClient,
      loadClientScheduling,
      loadClientSeries,
      loadClientSubscription,
      loadMeasurements,
      loadProfile,
      loadReview,
    } = routeArguments();

    // act
    const loaded = await loader(args);

    // assert
    expect(loaded).toEqual({
      client: CLIENT,
      subscription: SUBSCRIPTION,
      review: REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS,
      scheduling: "awaiting_onboarding",
      weekly: WEEKLY,
    });
    expect(loadClientSeries).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadClient).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadClientSubscription).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadClientScheduling).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadReview).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadProfile).toHaveBeenCalledWith(args, CLIENT_ID);
    expect(loadMeasurements).toHaveBeenCalledWith(args, CLIENT_ID);
  });

  it("reads her identity alone as her profile before her answers are approved", async () => {
    // arrange
    const { args, loadProfile } = routeArguments();
    const awaiting: ClientProfileView = {
      ...PROFILE,
      coaching: null,
      preferences: { preferredCheckInWeekday: null, preferredChannel: null },
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
      subscription: SUBSCRIPTION,
      review: REVIEW,
      profile: PROFILE,
      measurements: MEASUREMENTS,
      scheduling: "awaiting_onboarding" as const,
      weekly: WEEKLY,
    };

    // act
    const descriptors = meta({ loaderData: data } as Parameters<
      typeof meta
    >[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Ana Popescu | Evoa" }]);
  });
});

function routeArguments() {
  const loadClient = vi.fn().mockResolvedValue(CLIENT);
  const loadClientSubscription = vi.fn().mockResolvedValue(SUBSCRIPTION);
  const loadReview = vi.fn().mockResolvedValue(REVIEW);
  const loadProfile = vi.fn().mockResolvedValue(PROFILE);
  const loadMeasurements = vi.fn().mockResolvedValue(MEASUREMENTS);
  const loadClientScheduling = vi.fn().mockResolvedValue("awaiting_onboarding");
  const loadClientSeries = vi.fn().mockResolvedValue(WEEKLY);
  const args = createRequestArgs({
    contexts: [
      contextEntry(clientsContext, {
        coachClients: { loadClient },
      } as unknown as ClientsFeature),
      contextEntry(coachingSalesContext, {
        coachSales: { loadClientSubscription },
      } as unknown as CoachingSalesFeature),
      contextEntry(clientOnboardingContext, {
        coachReview: { loadReview },
      } as unknown as ClientOnboardingFeature),
      contextEntry(clientProfileContext, {
        coachProfile: { load: loadProfile, loadMeasurements },
      } as unknown as ClientProfileFeature),
      contextEntry(checkInsContext, {
        coachCheckIns: { loadClientScheduling },
        coachCheckInSeries: { loadClientSeries },
      } as unknown as CheckInsFeature),
    ],
    params: { clientId: CLIENT_ID },
    request: new Request(`http://localhost/coach/clients/${CLIENT_ID}`),
  });

  return {
    args,
    loadClient,
    loadClientScheduling,
    loadClientSeries,
    loadClientSubscription,
    loadMeasurements,
    loadProfile,
    loadReview,
  };
}
