import type { UpdateClientIdentityAsCoachUseCase } from "~/bounded-contexts/clients/clients/domain/client";
import { describe, expect, it, vi } from "vitest";
import type { SessionAccount } from "~/bounded-contexts/access/public/session";

import { createRequestArgs } from "~/composition-root/test-support/request-args";

import { CoachClientIdentityController } from "./coach-client-identity-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const CLIENT: SessionAccount = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH: SessionAccount = {
  authSubjectId: "user_eli",
  id: "acct_eli",
  role: "COACH",
};

const ENTERED = {
  firstName: "Ana-Maria",
  lastName: "Ionescu",
  dateOfBirth: "1994-03-15",
  country: "RO",
  phoneCountry: "RO",
  phoneNumber: "0712 345 678",
};

describe("CoachClientIdentityController save", () => {
  it("saves her identity with the gender the coach chose", async () => {
    // arrange
    const { controller, updateAsCoach } = createController();

    // act
    const response = await controller.save(
      accountArgs(COACH, { ...ENTERED, gender: "prefer_not_to_say" }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "saved" });
    expect(updateAsCoach).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      identity: {
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        dateOfBirth: "1994-03-15",
        country: "RO",
        phone: { country: "RO", nationalNumber: "0712 345 678" },
        gender: "prefer_not_to_say",
      },
    });
  });

  it("refuses a body without a gender without saving anything", async () => {
    // arrange
    const { controller, updateAsCoach } = createController();

    // act
    const response = await controller.save(
      accountArgs(COACH, ENTERED),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(400);
    expect(updateAsCoach).not.toHaveBeenCalled();
  });

  it("answers not found to an id that is not a uuid", async () => {
    // arrange
    const { controller } = createController();

    // act
    const response = await controller.save(
      accountArgs(COACH, { ...ENTERED, gender: "female" }),
      "nope",
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses a client on the coach's route", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.save(
        accountArgs(CLIENT, { ...ENTERED, gender: "female" }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

function createController() {
  const updateAsCoach = vi.fn().mockResolvedValue({ status: "saved" });
  const controller = new CoachClientIdentityController({
    updateClientIdentityAsCoach: {
      execute: updateAsCoach,
    } as unknown as UpdateClientIdentityAsCoachUseCase,
  });

  return { controller, updateAsCoach };
}

function accountArgs(account: SessionAccount, body: unknown) {
  const portal = {
    appBasePath: "/",
    publicAppUrl: "https://evoa.fit",
    signInUrl: "https://accounts.evoa.fit/sign-in",
  };

  return createRequestArgs({
    portal,
    session: { account, kind: "authenticated" },
    request: new Request("https://evoa.fit/api/clients/identity", {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
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
