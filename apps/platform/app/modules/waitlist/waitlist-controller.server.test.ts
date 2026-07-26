import {
  waitlistJoinResponseSchema,
  waitlistSchema,
} from "@eli-coach-platform/contracts";
import type { WaitingListService } from "@eli-coach-platform/domain";
import { describe, expect, it, vi } from "vitest";

import { handleHttpErrorResponse } from "~/server/http.server";

import { WaitlistController } from "./waitlist-controller.server";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

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

function serializeCapturedLoggerArguments(argumentsList: unknown[][]): string {
  return JSON.stringify(argumentsList, (_key, value: unknown) => {
    if (value instanceof Error) {
      return {
        cause: value.cause,
        message: value.message,
        name: value.name,
        params: (value as Error & { params?: unknown }).params,
        stack: value.stack,
      };
    }

    return value;
  });
}

describe("WaitlistController", () => {
  it("rejects waitlist submissions that fail bot verification before joining", async () => {
    // arrange
    const joinWaitlist = vi.fn();
    const botVerifier = createBotVerifier({ valid: false });
    const controller = createController({ joinWaitlist }, botVerifier);

    // act
    const response = await handleHttpErrorResponse(() =>
      controller.join(createJoinRequest({ email: "eli@example.com" })),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    // assert
    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "bot_verification_failed" },
    });
    if (body.success) {
      throw new Error("Expected bot verification to reject the submission.");
    }
    expect(body.error.message.trim().length).toBeGreaterThan(0);
    expect(botVerifier.verifySubmission).toHaveBeenCalledWith({
      action: "waitlist_join",
      remoteIp: null,
      token: null,
    });
    expect(joinWaitlist).not.toHaveBeenCalled();
  });

  it("verifies the Turnstile token before persisting the waitlist signup", async () => {
    // arrange
    const joinWaitlist = vi.fn().mockResolvedValue({
      status: "registered",
    });
    const botVerifier = createBotVerifier({ valid: true });
    const controller = createController({ joinWaitlist }, botVerifier);

    // act
    const response = await handleHttpErrorResponse(() =>
      controller.join(
        createJoinRequest({
          email: "eli@example.com",
          turnstileToken: "valid-turnstile-token",
        }),
      ),
    );

    // assert
    expect(response.status).toBe(201);
    expect(botVerifier.verifySubmission).toHaveBeenCalledWith({
      action: "waitlist_join",
      remoteIp: null,
      token: "valid-turnstile-token",
    });
    expect(joinWaitlist).toHaveBeenCalledWith({ email: "eli@example.com" });
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("returns public success for duplicate signups and logs a privacy-safe signal", async () => {
    // arrange
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const controller = createController({
      joinWaitlist: vi.fn().mockResolvedValue({
        status: "already_registered",
      }),
    });

    try {
      // act
      const response = await handleHttpErrorResponse(() =>
        controller.join(
          createJoinRequest({
            email: "eli@example.com",
            turnstileToken: "valid-turnstile-token",
          }),
        ),
      );
      const body = waitlistJoinResponseSchema.parse(await response.json());

      // assert
      expect(response.status).toBe(201);
      expect(body).toEqual({ success: true });
      expect(warning).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
      expect(JSON.stringify(warning.mock.calls)).not.toContain("eli@example.com");
    } finally {
      warning.mockRestore();
    }
  });

  it("returns a server error signup response when joining fails unexpectedly", async () => {
    // arrange
    const controller = createController({
      joinWaitlist: vi.fn().mockRejectedValue(new Error("database unavailable")),
    });

    // act
    const response = await handleHttpErrorResponse(() =>
      controller.join(
        createJoinRequest({
          email: "eli@example.com",
          turnstileToken: "valid-turnstile-token",
        }),
      ),
    );
    const body = waitlistJoinResponseSchema.parse(await response.json());

    // assert
    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      success: false,
      error: { code: "server_error" },
    });
    if (body.success) {
      throw new Error("Expected the controller to return a server error.");
    }
    expect(body.error.message.trim().length).toBeGreaterThan(0);
  });

  it("does not log submitted email derivatives or failure details when joining fails", async () => {
    // arrange
    const email = "privacy-regression@example.com";
    const nestedError = Object.assign(new Error(`nested failure for ${email}`), {
      params: [email],
    });
    const repositoryError = Object.assign(new Error(`query failed for ${email}`), {
      cause: nestedError,
      params: [email],
    });
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const controller = createController({
      joinWaitlist: vi.fn().mockRejectedValue(repositoryError),
    });

    try {
      // act
      const response = await handleHttpErrorResponse(() =>
        controller.join(
          createJoinRequest({
            email,
            turnstileToken: "valid-turnstile-token",
          }),
        ),
      );

      // assert
      expect(response.status).toBe(500);
      expect(errorLogger).toHaveBeenCalledWith(
        expect.any(String),
        {
          errorCategory: "waitlist_join_failure",
        },
      );
      const capturedLoggerArguments = serializeCapturedLoggerArguments(
        errorLogger.mock.calls,
      );
      expect(capturedLoggerArguments).not.toContain(email);
      expect(capturedLoggerArguments).not.toContain("emailHash");
      expect(capturedLoggerArguments).not.toContain(repositoryError.message);
      expect(capturedLoggerArguments).not.toContain(nestedError.message);
      expect(capturedLoggerArguments).not.toContain('"cause"');
    } finally {
      errorLogger.mockRestore();
    }
  });

  it("still lets unexpected waitlist failures bubble to the route fallback", async () => {
    // arrange
    const repositoryFailure = new Error("database unavailable");
    const controller = createController({
      getWaitlist: vi.fn().mockRejectedValue(repositoryFailure),
    });

    // act
    const waitlist = controller.getWaitlist();

    // assert
    await expect(waitlist).rejects.toBe(repositoryFailure);
  });

  it("returns parsed waitlist runtime data when the service succeeds", async () => {
    // arrange
    const controller = createController({
      getWaitlist: vi.fn().mockResolvedValue({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    });

    // act
    const response = await controller.getWaitlist();
    const body = waitlistSchema.parse(await response.json());

    // assert
    expect(response.status).toBe(200);
    expect(body).toEqual({
      availability: "available",
      enabled: true,
      offer: activeOffer,
    });
  });
});
