import type { AccountSnapshot } from "~/bounded-contexts/access/accounts/domain/account";
import type {
  ReadOwnClientSettingsUseCase,
  SaveUnitPreferenceUseCase,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
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

import { ClientSettingsController } from "./client-settings-controller.server";

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

describe("ClientSettingsController saveUnits", () => {
  it("saves the units she chose and answers no content", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const response = await controller.saveUnits(
      clientArgs({
        body: JSON.stringify({ weightUnit: "lb", heightUnit: "ft-in" }),
      }),
    );

    // assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "saved" });
    expect(saveUnitPreference).toHaveBeenCalledWith({
      authSubjectId: "user_ana",
      preference: { weightUnit: "lb", heightUnit: "ft-in" },
    });
  });

  it("answers not found to a client account with no client record", async () => {
    // arrange
    const { controller } = createController({ status: "not-on-journey" });

    // act
    const response = await controller.saveUnits(
      clientArgs({
        body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not-on-journey" });
  });

  it("answers conflict to a client whose portal access has ended", async () => {
    // arrange
    const { controller } = createController({ status: "ended" });

    // act
    const response = await controller.saveUnits(
      clientArgs({
        body: JSON.stringify({ weightUnit: "kg", heightUnit: "cm" }),
      }),
    );

    // assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "ended" });
  });

  it("refuses a unit the platform does not offer without saving anything", async () => {
    // arrange
    const { controller, saveUnitPreference } = createController({
      status: "saved",
    });

    // act
    const response = await controller.saveUnits(
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
    const response = await controller.saveUnits(
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
      controller.saveUnits(
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

describe("ClientSettingsController load", () => {
  it("hands her her units and her two preferences", async () => {
    // arrange
    const { controller, readOwnClientSettings } = createController({
      status: "saved",
    });

    // act
    const settings = await controller.load(clientArgs({ body: "" }));

    // assert
    expect(settings).toEqual({
      units: { weightUnit: "lb", heightUnit: "ft-in" },
      preferredCheckInWeekday: "monday",
      preferredChannel: "whatsapp",
    });
    expect(readOwnClientSettings).toHaveBeenCalledWith("user_ana");
  });

  it("refuses the coach without reading any settings", async () => {
    // arrange
    const { controller, readOwnClientSettings } = createController({
      status: "saved",
    });

    // act
    const thrown = await captureThrown(() =>
      controller.load(clientArgs({ body: "", session: COACH_SESSION })),
    );

    // assert
    expect((thrown as Response).status).toBe(403);
    expect(readOwnClientSettings).not.toHaveBeenCalled();
  });
});

function createController(result: SaveUnitPreferenceResult) {
  const saveUnitPreference = vi.fn().mockResolvedValue(result);
  const readOwnClientSettings = vi.fn().mockResolvedValue({
    clientId: "client-1",
    unitPreference: { weightUnit: "lb", heightUnit: "ft-in" },
    preferredCheckInWeekday: "monday",
    preferredChannel: "whatsapp",
    updatedAt: new Date("2026-10-01T08:00:00.000Z"),
  });
  const controller = new ClientSettingsController({
    readOwnClientSettings: {
      execute: readOwnClientSettings,
    } as unknown as ReadOwnClientSettingsUseCase,
    saveUnitPreference: {
      execute: saveUnitPreference,
    } as unknown as SaveUnitPreferenceUseCase,
  });

  return { controller, readOwnClientSettings, saveUnitPreference };
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
