import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { UpdateOwnClientIdentityUseCase } from "@eli-coach-platform/domain/client";
import { describe, expect, it, vi } from "vitest";

import type { AccountsFeature } from "~/features/accounts/server/accounts-composition.server";
import { accountsContext } from "~/features/accounts/server/guards/accounts-context.server";
import { sessionContext } from "~/features/accounts/server/guards/session-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/server/test-support/request-args";

import { OwnClientIdentityController } from "./own-client-identity-controller.server";

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

describe("OwnClientIdentityController save", () => {
  it("hands her names, date of birth, country and phone as she entered them and answers that it is saved", async () => {
    // arrange
    const { controller, updateOwn } = createController();

    // act
    const response = await controller.save(accountArgs(CLIENT, ENTERED));

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "saved" });
    expect(updateOwn).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      identity: {
        firstName: "Ana-Maria",
        lastName: "Ionescu",
        dateOfBirth: "1994-03-15",
        country: "RO",
        phone: { country: "RO", nationalNumber: "0712 345 678" },
      },
    });
  });

  it("hands an empty phone when she leaves it out", async () => {
    // arrange
    const { controller, updateOwn } = createController();
    const {
      phoneCountry: _country,
      phoneNumber: _number,
      ...withoutPhone
    } = ENTERED;

    // act
    await controller.save(accountArgs(CLIENT, withoutPhone));

    // assert
    expect(updateOwn).toHaveBeenCalledWith(
      expect.objectContaining({
        identity: expect.objectContaining({
          phone: { country: "", nationalNumber: "" },
        }),
      }),
    );
  });

  it("answers every problem of one entry in one refusal", async () => {
    // arrange
    const problems = {
      firstName: "missing",
      dateOfBirth: "too-young",
      phone: "invalid",
      country: "invalid",
    } as const;
    const { controller, updateOwn } = createController({
      own: { status: "invalid", problems },
    });

    // act
    const response = await controller.save(
      accountArgs(CLIENT, {
        ...ENTERED,
        firstName: " ",
        dateOfBirth: "2015-01-01",
        phoneNumber: "12",
        country: "ZZ",
      }),
    );

    // assert
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ problems });
    expect(updateOwn).toHaveBeenCalledTimes(1);
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
    const response = await controller.save(accountArgs(CLIENT, ENTERED));

    // assert
    expect(response.status).toBe(status);
  });

  it("refuses the coach on her own route", async () => {
    // arrange
    const { controller } = createController();

    // act
    const thrown = await captureThrown(() =>
      controller.save(accountArgs(COACH, ENTERED)),
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
  const controller = new OwnClientIdentityController({
    updateOwnClientIdentity: {
      execute: updateOwn,
    } as unknown as UpdateOwnClientIdentityUseCase,
  });

  return { controller, updateOwn };
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
