import {
  waitlistJoinResponseSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { WaitingListService } from "@eli-coach-platform/domain";
import { describe, expect, it, vi } from "vitest";

import { handleHttpErrorResponse } from "~/server/http.server";

import { WaitlistController } from "./waitlist-controller.server";

function createJoinRequest(options: { email: string; turnstileToken?: string }): Request {
  const body = new URLSearchParams({ email: options.email });

  if (options.turnstileToken) {
    body.set("cf-turnstile-response", options.turnstileToken);
  }

  return new Request("http://localhost/api/waitlist", {
    body,
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
}

function createBotVerifier(result: { valid: boolean }) {
  return {
    verifySubmission: vi.fn().mockResolvedValue(result),
  };
}

function createController(
  service: Partial<WaitingListService>,
  botVerifier = createBotVerifier({ valid: true }),
) {
  return new WaitlistController(service as WaitingListService, botVerifier);
}

describe("WaitlistController", () => {
  it("rejects waitlist submissions that fail bot verification before joining", async () => {
    const joinWaitlist = vi.fn();
    const botVerifier = createBotVerifier({ valid: false });
    const controller = createController({ joinWaitlist }, botVerifier);

    const response = await handleHttpErrorResponse(() =>
      controller.join(createJoinRequest({ email: "eli@example.com" })),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(400);
    expect(body).toEqual({
      success: false,
      error: {
        code: "bot_verification_failed",
        message: "Unable to process waitlist signup.",
      },
    });
    expect(botVerifier.verifySubmission).toHaveBeenCalledWith({
      action: "waitlist_join",
      remoteIp: null,
      token: null,
    });
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("verifies the Turnstile token before persisting the waitlist signup", async () => {
    const joinWaitlist = vi.fn().mockResolvedValue({
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
    });
    const botVerifier = createBotVerifier({ valid: true });
    const controller = createController({ joinWaitlist }, botVerifier);

    const response = await handleHttpErrorResponse(() =>
      controller.join(
        createJoinRequest({
          email: "eli@example.com",
          turnstileToken: "valid-turnstile-token",
        }),
      ),
    );

    expect(response.status).toBe(201);
    expect(botVerifier.verifySubmission).toHaveBeenCalledWith({
      action: "waitlist_join",
      remoteIp: null,
      token: "valid-turnstile-token",
    });
    expect(joinWaitlist).toHaveBeenCalledWith({ email: "eli@example.com" });
  });

  it("returns public success for duplicate signups and logs a privacy-safe signal", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const controller = createController({
      joinWaitlist: vi.fn().mockResolvedValue({
        pricing: "reduced",
        status: "already_registered",
        spotsRemaining: 9,
      }),
    });

    try {
      const response = await handleHttpErrorResponse(() =>
        controller.join(
          createJoinRequest({
            email: "eli@example.com",
            turnstileToken: "valid-turnstile-token",
          }),
        ),
      );
      const body = waitlistJoinResponseSchema.parse(await response.json());

      expect(response.status).toBe(201);
      expect(body).toEqual({
        pricing: "reduced",
        success: true,
        spotsRemaining: 9,
      });
      expect(warning).toHaveBeenCalledWith("Duplicate waitlist signup suppressed.", {
        emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      expect(JSON.stringify(warning.mock.calls)).not.toContain("eli@example.com");
    } finally {
      warning.mockRestore();
    }
  });

  it("returns a server error signup response when joining fails unexpectedly", async () => {
    const controller = createController({
      joinWaitlist: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    const response = await handleHttpErrorResponse(() =>
      controller.join(
        createJoinRequest({
          email: "eli@example.com",
          turnstileToken: "valid-turnstile-token",
        }),
      ),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    expect(response.status).toBe(500);
    expect(body).toEqual({
      success: false,
      error: {
        code: "server_error",
        message: "Unable to process waitlist signup.",
      },
    });
  });

  it("still lets unexpected snapshot failures bubble to the route fallback", async () => {
    const controller = createController({
      getWaitlist: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    await expect(controller.getSnapshot()).rejects.toThrow("database unavailable");
  });

  it("returns a parsed snapshot when the service succeeds", async () => {
    const controller = createController({
      getWaitlist: vi.fn().mockResolvedValue({
        enabled: true,
        cap: 10,
        spotsRemaining: 8,
      }),
    });

    const response = await controller.getSnapshot();
    const body = waitlistSnapshotSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(body).toEqual({
      enabled: true,
      cap: 10,
      spotsRemaining: 8,
    });
  });
});
