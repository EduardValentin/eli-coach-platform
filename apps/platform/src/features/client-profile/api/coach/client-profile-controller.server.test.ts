import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import {
  MeasurementHistory,
  type ClientProfileReading,
  type MeasurementRecord,
  type ReadClientMeasurementHistoryUseCase,
  type ReadClientProfileUseCase,
} from "@eli-coach-platform/domain/client-profile";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientProfileController } from "./client-profile-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";
const FIRST_ENTRY_ID = "0f5c7e1a-2b3d-4c5e-8f9a-1b2c3d4e5f60";
const SECOND_ENTRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const FRONT_PHOTO_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e";

const COACH: AccountSnapshot = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const CLIENT_SESSION: ResolvedSession = {
  account: { ...COACH, role: "CLIENT" },
  kind: "authenticated",
};

const ANONYMOUS_SESSION: ResolvedSession = { kind: "anonymous" };

const IDENTITY: ClientProfileReading["identity"] = {
  clientId: CLIENT_ID,
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

const IDENTITY_VIEW = {
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: "+40712345678",
};

describe("ClientProfileController load", () => {
  it("hands the coach her identity, her onboarding facts and her weights as the widget reads them", async () => {
    // arrange
    const facts = {
      heightCm: 168,
      activityLevel: "Lightly active",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "Vegetarian, Lactose",
      clientNotes: "I travel a lot.",
    };
    const { controller, readClientProfile } = createController({
      reading: {
        identity: IDENTITY,
        facts,
        startingWeightKg: 64.5,
        currentWeightKg: 63.8,
      },
    });

    // act
    const profile = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(profile).toEqual({
      identity: IDENTITY_VIEW,
      facts,
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
    });
    expect(readClientProfile).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("hands the coach her identity alone before she has sent her onboarding", async () => {
    // arrange
    const { controller } = createController({
      reading: {
        identity: IDENTITY,
        facts: null,
        startingWeightKg: null,
        currentWeightKg: null,
      },
    });

    // act
    const profile = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(profile).toEqual({
      identity: IDENTITY_VIEW,
      facts: null,
      startingWeightKg: null,
      currentWeightKg: null,
    });
  });

  it("answers not found to a uuid that is no client", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs(), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });

  it("answers not found to an id that is not a uuid without reading any profile", async () => {
    // arrange
    const { controller, readClientProfile } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs(), "not-a-uuid"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readClientProfile).not.toHaveBeenCalled();
  });

  it("refuses a client account without reading any profile", async () => {
    // arrange
    const { controller, readClientProfile } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs({ session: CLIENT_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientProfile).not.toHaveBeenCalled();
  });

  it("sends an anonymous visitor to sign in without reading any profile", async () => {
    // arrange
    const { controller, readClientProfile } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs({ session: ANONYMOUS_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readClientProfile).not.toHaveBeenCalled();
  });
});

describe("ClientProfileController load measurements", () => {
  it("hands the coach her entries newest first as rows with their photo ids and never where the photos are stored", async () => {
    // arrange
    const { controller, readClientMeasurementHistory } = createController({
      records: [
        {
          id: FIRST_ENTRY_ID,
          recordedAt: new Date("2026-09-01T09:00:00.000Z"),
          weightKg: 66.1,
          waistCm: 74,
          photos: [],
        },
        {
          id: SECOND_ENTRY_ID,
          recordedAt: new Date("2026-09-29T09:00:00.000Z"),
          weightKg: 64.5,
          waistCm: 72,
          hipsCm: 96.5,
          photos: [
            {
              id: FRONT_PHOTO_ID,
              entryId: SECOND_ENTRY_ID,
              clientId: CLIENT_ID,
              view: "front",
              reference: {
                storageKey: `${CLIENT_ID}/${SECOND_ENTRY_ID}/${FRONT_PHOTO_ID}.bin`,
                keyId: "local-1",
              },
              mimeType: "image/jpeg",
              sizeBytes: 182_431,
              createdAt: new Date("2026-09-29T09:00:00.000Z"),
            },
          ],
        },
      ],
    });

    // act
    const rows = await controller.loadMeasurements(coachArgs(), CLIENT_ID);

    // assert
    expect(rows).toEqual([
      {
        id: SECOND_ENTRY_ID,
        recordedAt: "2026-09-29T09:00:00.000Z",
        weightKg: 64.5,
        waistCm: 72,
        hipsCm: 96.5,
        thighCm: null,
        armCm: null,
        photos: [{ id: FRONT_PHOTO_ID, view: "front" }],
      },
      {
        id: FIRST_ENTRY_ID,
        recordedAt: "2026-09-01T09:00:00.000Z",
        weightKg: 66.1,
        waistCm: 74,
        hipsCm: null,
        thighCm: null,
        armCm: null,
        photos: [],
      },
    ]);
    expect(readClientMeasurementHistory).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
    });
  });

  it("answers not found to an id that is not a uuid without reading any measurement", async () => {
    // arrange
    const { controller, readClientMeasurementHistory } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadMeasurements(coachArgs(), "not-a-uuid"),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
    expect(readClientMeasurementHistory).not.toHaveBeenCalled();
  });

  it("refuses a client account without reading any measurement", async () => {
    // arrange
    const { controller, readClientMeasurementHistory } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.loadMeasurements(
        coachArgs({ session: CLIENT_SESSION }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readClientMeasurementHistory).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    reading?: ClientProfileReading | null;
    records?: MeasurementRecord[];
  } = {},
) {
  const readClientProfile = vi.fn().mockResolvedValue(options.reading ?? null);
  const readClientMeasurementHistory = vi
    .fn()
    .mockResolvedValue(MeasurementHistory.of(options.records ?? []));
  const controller = new ClientProfileController({
    readClientMeasurementHistory: {
      execute: readClientMeasurementHistory,
    } as unknown as ReadClientMeasurementHistoryUseCase,
    readClientProfile: {
      execute: readClientProfile,
    } as unknown as ReadClientProfileUseCase,
  });

  return { controller, readClientMeasurementHistory, readClientProfile };
}

function coachArgs(options: { session?: ResolvedSession } = {}) {
  return createRequestArgs({
    contexts: sessionContexts(options.session),
    request: new Request(`https://evoa.fit/coach/clients/${CLIENT_ID}`),
  });
}

function sessionContexts(session?: ResolvedSession) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return [
    contextEntry(accountsContext, accounts),
    contextEntry(
      sessionContext,
      session ?? { account: COACH, kind: "authenticated" },
    ),
  ];
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
