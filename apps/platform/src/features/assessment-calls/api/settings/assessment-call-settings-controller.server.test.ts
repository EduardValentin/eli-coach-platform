import type { AccountSnapshot } from "@eli-coach-platform/domain/account";
import { RouterContextProvider, type ActionFunctionArgs } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { sessionContext } from "~/features/accounts/server/guards/session-context.server";

import { AssessmentCallSettingsController } from "./assessment-call-settings-controller.server";

const VALID_SETTINGS = {
  timeZone: "Europe/Bucharest",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  startHour: 17,
  endHour: 20,
  meetingLink: null,
};

describe("AssessmentCallSettingsController", () => {
  describe("loadSettingsPage", () => {
    it("parses the use case snapshot through the wire contract", async () => {
      // arrange
      const getSettings = {
        execute: vi.fn().mockResolvedValue(VALID_SETTINGS),
      };
      const controller = new AssessmentCallSettingsController({
        getSettings: getSettings as never,
        updateSettings: { execute: vi.fn() } as never,
      });

      // act
      const settings = await controller.loadSettingsPage();

      // assert
      expect(settings).toEqual(VALID_SETTINGS);
    });
  });

  describe("updateSettings", () => {
    it("propagates the guard's 401 for an anonymous caller", async () => {
      // arrange
      const controller = createController();
      const args = createActionArgs({
        body: VALID_SETTINGS,
        session: { kind: "anonymous" },
      });

      // act
      const thrown = await captureThrown(() => controller.updateSettings(args));

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(401);
    });

    it("propagates the guard's 403 for a client account", async () => {
      // arrange
      const controller = createController();
      const args = createActionArgs({
        body: VALID_SETTINGS,
        session: {
          account: buildAccount({ role: "CLIENT" }),
          kind: "authenticated",
        },
      });

      // act
      const thrown = await captureThrown(() => controller.updateSettings(args));

      // assert
      expect(thrown).toBeInstanceOf(Response);
      expect((thrown as Response).status).toBe(403);
    });

    it("answers 400 no_weekday for an empty weekday list", async () => {
      // arrange
      const controller = createController();
      const args = createCoachArgs({
        ...VALID_SETTINGS,
        weekdays: [],
      });

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        success: false,
        error: { code: "no_weekday", message: "Pick at least one day." },
      });
    });

    it("answers 400 invalid_hours for an out-of-range start hour", async () => {
      // arrange
      const controller = createController();
      const args = createCoachArgs({ ...VALID_SETTINGS, startHour: -1 });

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "invalid_hours" },
      });
    });

    it("answers 400 invalid_meeting_link for a non-https link", async () => {
      // arrange
      const controller = createController();
      const args = createCoachArgs({
        ...VALID_SETTINGS,
        meetingLink: "http://meet.example/eli",
      });

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "invalid_meeting_link" },
      });
    });

    it("answers 400 invalid_time_zone for a zone the runtime does not know", async () => {
      // arrange
      const controller = createController();
      const args = createCoachArgs({
        ...VALID_SETTINGS,
        timeZone: "Mars/Olympus_Mons",
      });

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "invalid_time_zone" },
      });
    });

    it("maps the use case's invalid result onto its matching problem code", async () => {
      // arrange
      const updateSettings = {
        execute: vi
          .fn()
          .mockResolvedValue({ problems: ["no_weekday"], status: "invalid" }),
      };
      const controller = new AssessmentCallSettingsController({
        getSettings: { execute: vi.fn() } as never,
        updateSettings: updateSettings as never,
      });
      const args = createCoachArgs(VALID_SETTINGS);

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "no_weekday" },
      });
    });

    it("saves and answers 200 with the saved settings", async () => {
      // arrange
      const updateSettings = {
        execute: vi
          .fn()
          .mockResolvedValue({ settings: VALID_SETTINGS, status: "saved" }),
      };
      const controller = new AssessmentCallSettingsController({
        getSettings: { execute: vi.fn() } as never,
        updateSettings: updateSettings as never,
      });
      const args = createCoachArgs(VALID_SETTINGS);

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        settings: VALID_SETTINGS,
      });
      expect(updateSettings.execute).toHaveBeenCalledWith(VALID_SETTINGS);
    });

    it("answers 500 server_error when the use case throws", async () => {
      // arrange
      const updateSettings = {
        execute: vi.fn().mockRejectedValue(new Error("database down")),
      };
      const controller = new AssessmentCallSettingsController({
        getSettings: { execute: vi.fn() } as never,
        updateSettings: updateSettings as never,
      });
      const args = createCoachArgs(VALID_SETTINGS);

      // act
      const response = await controller.updateSettings(args);

      // assert
      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toMatchObject({
        error: { code: "server_error" },
      });
    });
  });
});

function createController(): AssessmentCallSettingsController {
  return new AssessmentCallSettingsController({
    getSettings: { execute: vi.fn() } as never,
    updateSettings: { execute: vi.fn() } as never,
  });
}

function createCoachArgs(body: unknown): ActionFunctionArgs {
  return createActionArgs({
    body,
    session: {
      account: buildAccount({ role: "COACH" }),
      kind: "authenticated",
    },
  });
}

function createActionArgs(options: {
  body: unknown;
  session:
    { kind: "anonymous" } | { account: AccountSnapshot; kind: "authenticated" };
}): ActionFunctionArgs {
  const context = new RouterContextProvider(
    new Map([[sessionContext, options.session]]),
  );

  return {
    context,
    params: {},
    request: new Request("https://eli.example/api/assessment-calls/settings", {
      body: JSON.stringify(options.body),
      headers: { "Content-Type": "application/json" },
      method: "PUT",
    }),
  } as unknown as ActionFunctionArgs;
}

function buildAccount(overrides: Partial<AccountSnapshot>): AccountSnapshot {
  return {
    authSubjectId: "user_1",
    id: "acct_1",
    role: "CLIENT",
    ...overrides,
  };
}

async function captureThrown(thunk: () => unknown): Promise<unknown> {
  try {
    await thunk();
    return undefined;
  } catch (thrown) {
    return thrown;
  }
}
