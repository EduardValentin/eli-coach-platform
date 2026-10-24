import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type {
  UpdateClientIdentityAsCoachUseCase,
  UpdateOwnClientIdentityUseCase,
} from "@eli-coach-platform/domain/client";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { ClientIdentityController } from "./client-identity-controller.server";

const CLIENT_ID = "7c6c5a52-8f4f-4e5a-a2b7-5c3f6a9c1d22";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH: AccountSnapshot = {
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

describe("ClientIdentityController saveOwn", () => {
  it("saves her names, date of birth, country and her phone in E.164 and answers no content", async () => {
    // arrange
    const { controller, updateOwn } = createController();

    // act
    const response = await controller.saveOwn(accountArgs(CLIENT, ENTERED));

    // assert
    expect(response.status).toBe(204);
    expect(updateOwn).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      identity: {
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        dateOfBirth: "1994-03-15",
        country: "RO",
        phone: "+40712345678",
      },
    });
  });

  it("saves no phone when she leaves it empty", async () => {
    // arrange
    const { controller, updateOwn } = createController();

    // act
    await controller.saveOwn(
      accountArgs(CLIENT, { ...ENTERED, phoneNumber: "" }),
    );

    // assert
    expect(updateOwn).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: expect.objectContaining({ phone: null }),
      }),
    );
  });

  it("names a phone and a country it cannot read without saving anything", async () => {
    // arrange
    const { controller, updateOwn } = createController();

    // act
    const response = await controller.saveOwn(
      accountArgs(CLIENT, { ...ENTERED, phoneNumber: "12", country: "ZZ" }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      problems: { phone: "invalid", country: "invalid" },
    });
    expect(updateOwn).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: "not-on-journey" }, 404],
    [{ status: "ended" }, 409],
    [{ status: "invalid", problems: { dateOfBirth: "too-young" } }, 422],
  ] satisfies [
    Awaited<ReturnType<UpdateOwnClientIdentityUseCase["execute"]>>,
    number,
  ][])("answers %o with %d", async (result, status) => {
    // arrange
    const { controller } = createController({ own: result });

    // act
    const response = await controller.saveOwn(accountArgs(CLIENT, ENTERED));

    // assert
    expect(response.status).toBe(status);
  });

  it("refuses the coach on her own route", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.saveOwn(accountArgs(COACH, ENTERED)),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

describe("ClientIdentityController saveAsCoach", () => {
  it("saves her identity with the gender the coach chose", async () => {
    // arrange
    const { controller, updateAsCoach } = createController();

    // act
    const response = await controller.saveAsCoach(
      accountArgs(COACH, { ...ENTERED, gender: "prefer_not_to_say" }),
      CLIENT_ID,
    );

    // assert
    expect(response.status).toBe(204);
    expect(updateAsCoach).toHaveBeenCalledWith({
      clientId: CLIENT_ID,
      identity: {
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        dateOfBirth: "1994-03-15",
        country: "RO",
        phone: "+40712345678",
        gender: "prefer_not_to_say",
      },
    });
  });

  it("refuses a body without a gender without saving anything", async () => {
    // arrange
    const { controller, updateAsCoach } = createController();

    // act
    const response = await controller.saveAsCoach(
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
    const response = await controller.saveAsCoach(
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
      controller.saveAsCoach(
        accountArgs(CLIENT, { ...ENTERED, gender: "female" }),
        CLIENT_ID,
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
  });
});

function createController(
  results: {
    own?: Awaited<ReturnType<UpdateOwnClientIdentityUseCase["execute"]>>;
  } = {},
) {
  const updateOwn = vi
    .fn()
    .mockResolvedValue(results.own ?? { status: "saved" });
  const updateAsCoach = vi.fn().mockResolvedValue({ status: "saved" });
  const controller = new ClientIdentityController({
    updateClientIdentityAsCoach: {
      execute: updateAsCoach,
    } as unknown as UpdateClientIdentityAsCoachUseCase,
    updateOwnClientIdentity: {
      execute: updateOwn,
    } as unknown as UpdateOwnClientIdentityUseCase,
  });

  return { controller, updateAsCoach, updateOwn };
}

function accountArgs(account: AccountSnapshot, body: unknown) {
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
      contextEntry(sessionContext, { account, kind: "authenticated" }),
    ],
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
