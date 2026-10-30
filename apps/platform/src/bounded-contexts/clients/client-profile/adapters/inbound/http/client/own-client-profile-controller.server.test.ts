import type {
  OwnClientProfileReading,
  ReadOwnClientProfileUseCase,
  SharedCoachingFacts,
  UpdateOwnClientProfileUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-profile";
import { describe, expect, it, vi } from "vitest";
import type {
  ResolvedSession,
  SessionAccount,
} from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { OwnClientProfileController } from "./own-client-profile-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const CLIENT: SessionAccount = {
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
    const { ownClientProfileController, readOwnClientProfile } =
      createController();

    // act
    const profile = await ownClientProfileController.load(clientArgs());

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
    const { ownClientProfileController } = createController({ reading: null });

    // act
    const thrown = await captureThrown(() =>
      ownClientProfileController.load(clientArgs()),
    );

    // assert
    expect((thrown as Response).status).toBe(404);
  });
});

describe("OwnClientProfileController save", () => {
  it("saves the facts she shares with her coach and answers that it is saved", async () => {
    // arrange
    const { ownClientProfileController, updateOwnClientProfile } =
      createController();

    // act
    const response = await ownClientProfileController.save(
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
      const { ownClientProfileController } = createController({ update });

      // act
      const response = await ownClientProfileController.save(
        clientArgs({ body: { facts: SHARED } }),
      );

      // assert
      expect(response.status).toBe(status);
    },
  );

  it("refuses equipment the profile does not know without saving anything", async () => {
    // arrange
    const { ownClientProfileController, updateOwnClientProfile } =
      createController();

    // act
    const response = await ownClientProfileController.save(
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
    const { ownClientProfileController, updateOwnClientProfile } =
      createController();

    // act
    const thrown = await captureThrown(() =>
      ownClientProfileController.save(
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
  const ownClientProfileController = new OwnClientProfileController({
    readOwnClientProfileUseCase: {
      execute: readOwnClientProfile,
    } as unknown as ReadOwnClientProfileUseCase,
    updateOwnClientProfileUseCase: {
      execute: updateOwnClientProfile,
    } as unknown as UpdateOwnClientProfileUseCase,
  });

  return {
    ownClientProfileController,
    readOwnClientProfile,
    updateOwnClientProfile,
  };
}

function clientArgs(
  options: { body?: unknown; session?: ResolvedSession } = {},
) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: options.session ?? { account: CLIENT, kind: "authenticated" },
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
