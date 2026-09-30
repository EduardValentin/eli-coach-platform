import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type {
  ClientProfileSnapshot,
  ReadClientProfileUseCase,
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
const SUBMITTED_AT = new Date("2026-09-28T09:00:00.000Z");

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

describe("ClientProfileController load", () => {
  it("hands the coach her profile as the widget reads it", async () => {
    // arrange
    const { controller, readClientProfile } = createController({
      profile: {
        clientId: CLIENT_ID,
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        country: "RO",
        phone: "+40712345678",
        heightCm: 168,
        startingWeightKg: 64.5,
        currentWeightKg: 63.8,
        activityLevel: "Lightly active",
        primaryGoal: "Lose fat",
        dietaryRestrictions: "Vegetarian, Lactose",
        clientNotes: "I travel a lot.",
        updatedAt: SUBMITTED_AT,
      },
    });

    // act
    const profile = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(profile).toEqual({
      dateOfBirth: "1994-03-14",
      gender: "female",
      country: "RO",
      phone: "+40712345678",
      heightCm: 168,
      startingWeightKg: 64.5,
      currentWeightKg: 63.8,
      activityLevel: "Lightly active",
      primaryGoal: "Lose fat",
      dietaryRestrictions: "Vegetarian, Lactose",
      clientNotes: "I travel a lot.",
    });
    expect(readClientProfile).toHaveBeenCalledWith(CLIENT_ID);
  });

  it("answers no profile before the client has sent her onboarding", async () => {
    // arrange
    const { controller } = createController({ profile: null });

    // act
    const profile = await controller.load(coachArgs(), CLIENT_ID);

    // assert
    expect(profile).toBeNull();
  });

  it("answers not found to an id that is not a uuid without reading any profile", async () => {
    // arrange
    const { controller, readClientProfile } = createController({
      profile: null,
    });

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
    const { controller, readClientProfile } = createController({
      profile: null,
    });

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
    const { controller, readClientProfile } = createController({
      profile: null,
    });

    // act
    const thrown = await captureThrown(() =>
      controller.load(coachArgs({ session: ANONYMOUS_SESSION }), CLIENT_ID),
    );

    // assert
    expect((thrown as Response).status).toBe(302);
    expect(readClientProfile).not.toHaveBeenCalled();
  });
});

function createController(
  options: { profile?: ClientProfileSnapshot | null } = {},
) {
  const readClientProfile = vi.fn().mockResolvedValue(options.profile ?? null);
  const controller = new ClientProfileController({
    readClientProfile: {
      execute: readClientProfile,
    } as unknown as ReadClientProfileUseCase,
  });

  return { controller, readClientProfile };
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
