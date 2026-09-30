import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import type { SaveUnitPreferenceUseCase } from "@eli-coach-platform/domain/unit-preference";
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

import { UnitPreferenceController } from "./unit-preference-controller.server";

const CLIENT: AccountSnapshot = {
  authSubjectId: "user_ana",
  id: "acct_ana",
  role: "CLIENT",
};

const COACH_SESSION: ResolvedSession = {
  account: { ...CLIENT, role: "COACH" },
  kind: "authenticated",
};

const OVERSIZED_BODY_BYTES = 2048;

type SaveUnitPreferenceResult = Awaited<
  ReturnType<SaveUnitPreferenceUseCase["execute"]>
>;

describe("UnitPreferenceController save", () => {
  it("saves the units she chose and answers no content", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const response = await controller.save(
      clientArgs({
        body: JSON.stringify({ weightUnit: "lb", heightUnit: "ft-in" }),
      }),
    );

    // assert
    expect(response.status).toBe(204);
    expect(saveUnitPreference).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      preference: { weightUnit: "lb", heightUnit: "ft-in" },
    });
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ status: "not-on-journey" });

    // act
    const response = await controller.save(
      clientArgs({
        body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-on-journey" });
  });

  it("refuses a unit the platform does not offer without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const response = await controller.save(
      clientArgs({
        body: JSON.stringify({ weightUnit: "stone", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(saveUnitPreference).not.toHaveBeenCalled();
  });

  it("refuses a body beyond its size limit without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const response = await controller.save(
      clientArgs({
        body: JSON.stringify({
          weightUnit: "kg",
          heightUnit: "cm",
          padding: "x".repeat(OVERSIZED_BODY_BYTES),
        }),
      }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(saveUnitPreference).not.toHaveBeenCalled();
  });

  it("refuses the coach without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const thrown = await captureThrown(() =>
      controller.save(
        clientArgs({
          body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
          session: COACH_SESSION,
        }),
      ),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(saveUnitPreference).not.toHaveBeenCalled();
  });
});

function createController(result: SaveUnitPreferenceResult) {
  const saveUnitPreference = vi.fn().mockResolvedValue(result);
  const controller = new UnitPreferenceController({
    saveUnitPreference: {
      execute: saveUnitPreference,
    } as unknown as SaveUnitPreferenceUseCase,
  });

  return { controller, saveUnitPreference };
}

function clientArgs(options: { body: string; session?: ResolvedSession }) {
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
    request: new Request(
      "https://evoa.fit/api/client-profile/unit-preference",
      {
        body: options.body,
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      },
    ),
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
