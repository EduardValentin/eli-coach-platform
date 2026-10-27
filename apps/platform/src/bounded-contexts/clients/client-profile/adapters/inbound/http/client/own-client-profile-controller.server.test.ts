import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import type {
  OwnClientProfileReading,
  ReadOwnClientProfileUseCase,
  SharedCoachingFacts,
  UpdateOwnClientProfileUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { describe, expect, it, vi } from "vitest";

import {
  type AccountsFeature,
  accountsContext,
} from "~/bounded-contexts/access/accounts/adapters/inbound/http/context.server";
import {
  sessionContext,
  type ResolvedSession,
} from "~/bounded-contexts/access/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import { OwnClientProfileController } from "./own-client-profile-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH_SESSION: ResolvedSession = {
  account: { ...CLIENT, role: "COACH" },
  kind: "authenticated",
};

const SHARED: SharedCoachingFacts = {
  heightCm: 170,
  trainingDays: 4,
  sessionMinutes: 45,
  equipment: ["Dumbbells"],
  trainingPlace: "Home",
  limitations: "",
};

const READING: OwnClientProfileReading = {
  identity: {
    clientId: CLIENT_ID,
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    country: "RO",
    phone: null,
  },
  coaching: null,
  preferences: { preferredCheckInWeekday: null, preferredChannel: null },
  avatarId: "avatar-7",
  startingWeightKg: null,
  currentWeightKg: null,
};

type UpdateResult = Awaited<
  ReturnType<UpdateOwnClientProfileUseCase["execute"]>
>;

describe("OwnClientProfileController load", () => {
  it("hands her her own profile with her avatar address and never the coach's notes", async () => {
    // arrange
    const { controller, readOwnClientProfile } = createController();

    // act
    const profile = await controller.load(clientArgs());

    // assert
    expect(profile).toEqual({
      identity: {
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        country: "RO",
        phone: null,
      },
      coaching: null,
      preferences: { preferredCheckInWeekday: null, preferredChannel: null },
      avatarUrl: `/api/client-profile/avatar/${CLIENT_ID}?v=avatar-7`,
      startingWeightKg: null,
      currentWeightKg: null,
    });
    expect(profile).not.toHaveProperty("coachNotes");
    expect(readOwnClientProfile).toHaveBeenCalledWith("user_ana");
  });

  it("answers not found to an account with no client record", async () => {
    // arrange
    const { controller } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() => controller.load(clientArgs()));

    // assert
    expect((thrown as Response).status).toBe(404);
  });
});

describe("OwnClientProfileController save", () => {
  it("saves the facts she shares with her coach and answers that it is saved", async () => {
    // arrange
    const { controller, updateOwnClientProfile } = createController();

    // act
    const response = await controller.save(
      clientArgs({ body: { facts: SHARED } }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "saved" });
    expect(updateOwnClientProfile).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      facts: SHARED,
    });
  });

  it.each([
    [{ status: "not-on-journey" }, 404],
    [{ status: "ended" }, 409],
    [{ status: "not-seeded" }, 409],
    [{ status: "changed-meanwhile" }, 409],
    [{ status: "invalid", problems: { equipment: "exclusive" } }, 422],
  ] satisfies [UpdateResult, number][])(
    "answers %o with %d",
    async (update, status) => {
      // arrange
      const { controller } = createController({ update });

      // act
      const response = await controller.save(
        clientArgs({ body: { facts: SHARED } }),
      );

      // assert
      expect(response.status).toBe(status);
    },
  );

  it("refuses equipment the profile does not know without saving anything", async () => {
    // arrange
    const { controller, updateOwnClientProfile } = createController();

    // act
    const response = await controller.save(
      clientArgs({
        body: { facts: { ...SHARED, equipment: ["Rowing machine"] } },
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(updateOwnClientProfile).not.toHaveBeenCalled();
  });

  it("refuses the coach without saving anything", async () => {
    // arrange
    const { controller, updateOwnClientProfile } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.save(
        clientArgs({ body: { facts: SHARED }, session: COACH_SESSION }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(updateOwnClientProfile).not.toHaveBeenCalled();
  });
});

function createController(
  options: {
    reading?: OwnClientProfileReading | null;
    update?: UpdateResult;
  } = {},
) {
  const readOwnClientProfile = vi
    .fn()
    .mockResolvedValue(
      options.reading === undefined ? READING : options.reading,
    );
  const updateOwnClientProfile = vi
    .fn()
    .mockResolvedValue(options.update ?? { status: "saved" });
  const controller = new OwnClientProfileController({
    readOwnClientProfile: {
      execute: readOwnClientProfile,
    } as unknown as ReadOwnClientProfileUseCase,
    updateOwnClientProfile: {
      execute: updateOwnClientProfile,
    } as unknown as UpdateOwnClientProfileUseCase,
  });

  return { controller, readOwnClientProfile, updateOwnClientProfile };
}

function clientArgs(
  options: { body?: unknown; session?: ResolvedSession } = {},
) {
  const accounts = {
    portal: {
      appBasePath: "/",
      publicAppUrl: "https://evoa.fit",
      signInUrl: "https://accounts.evoa.fit/sign-in",
    },
  } as unknown as AccountsFeature;

  return createRequestArgs({
    contexts: [
      contextEntry(accountsContext, accounts),
      contextEntry(
        sessionContext,
        options.session ?? { account: CLIENT, kind: "authenticated" },
      ),
    ],
    request: new Request("https://evoa.fit/api/client-profile/profile", {
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: { "Content-Type": "application/json" },
      method: options.body === undefined ? "GET" : "PUT",
    }),
  });
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
