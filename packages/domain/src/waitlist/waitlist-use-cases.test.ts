import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "../feature-flag";
import { GetWaitlistUseCase } from "./get-waitlist-use-case";
import { JoinWaitlistUseCase } from "./join-waitlist-use-case";
import {
  Waitlist,
  type WaitlistConsentVersions,
  type WaitlistOffer,
} from "./waitlist";
import type { WaitlistConfirmation } from "./waitlist-confirmation";
import type { WaitlistEntries } from "./waitlist-entries";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;
const consentVersions = {
  privacyPolicyVersion: "privacy-policy-test-v1",
  marketingConsentVersion: "marketing-consent-test-v1",
} satisfies WaitlistConsentVersions;
const fixedClock = { now: () => new Date("2026-07-30T12:00:00.000Z") };

function createLogger() {
  return { error: vi.fn() };
}

function createFeatureFlags(
  flags: Record<string, boolean> = { WAITLIST_MODE: true },
): FeatureFlagReader {
  return {
    execute: vi.fn().mockResolvedValue(flags),
  };
}

function createWaitlist(): Waitlist {
  return Waitlist.configure({ cap: 10, offer: activeOffer });
}

function createWaitlistEntries(
  options?: Partial<WaitlistEntries>,
): WaitlistEntries {
  return {
    countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(0),
    registerReducedPricingSignup: vi.fn().mockResolvedValue({
      status: "registered",
    }),
    registerRegularPricingSignup: vi.fn().mockResolvedValue({
      status: "registered",
    }),
    ...options,
  };
}

function createConfirmation(): WaitlistConfirmation {
  return {
    sendConfirmation: vi.fn().mockResolvedValue({ kind: "sent" }),
  };
}

function createJoinWaitlist(options: {
  confirmation: WaitlistConfirmation;
  logger: ReturnType<typeof createLogger>;
  waitlistEntries: WaitlistEntries;
}): JoinWaitlistUseCase {
  return new JoinWaitlistUseCase({
    confirmation: options.confirmation,
    consentVersions,
    logger: options.logger,
    waitlist: createWaitlist(),
    waitlistEntries: options.waitlistEntries,
  });
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

describe("GetWaitlistUseCase", () => {
  it("returns the persisted mode independently of availability", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags({ WAITLIST_MODE: false }),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(0),
      }),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "available",
    });
  });

  it("treats an absent persisted flag as disabled", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags({}),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries(),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "available",
    });
  });

  it("uses safe waitlist mode without availability when feature flags are unreachable", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: {
        execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries(),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: null,
    });
  });

  it("records a failed feature flag read", async () => {
    // arrange
    const logger = createLogger();
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: {
        execute: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
      logger,
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries(),
    });

    // act
    await getWaitlist.execute();

    // assert
    expect(logger.error).toHaveBeenCalledWith(
      "Waitlist mode feature flag read failed.",
      { errorCategory: "waitlist_mode_read_failure" },
    );
  });

  it("records nothing when the feature flags are read", async () => {
    // arrange
    const logger = createLogger();
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags(),
      logger,
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries(),
    });

    // act
    await getWaitlist.execute();

    // assert
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("returns the delayed available waitlist snapshot", async () => {
    // arrange
    const waitlistEntries = createWaitlistEntries({
      countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(7),
    });
    const getWaitlist = new GetWaitlistUseCase({
      clock: { now: () => new Date("2026-07-26T10:12:00.000Z") },
      featureFlags: createFeatureFlags(),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries,
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "available",
    });
    expect(
      waitlistEntries.countReducedPricingSignupsCreatedBefore,
    ).toHaveBeenCalledWith({
      campaignSlug: activeOffer.campaignSlug,
      createdBefore: new Date("2026-07-26T10:00:00.000Z"),
    });
  });

  it("returns the delayed limited waitlist snapshot", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags(),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(8),
      }),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "limited",
    });
  });

  it("returns the delayed closed waitlist snapshot when persisted mode is disabled", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags({ WAITLIST_MODE: false }),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(10),
      }),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "closed",
    });
  });

  it("retains the persisted mode when delayed availability is unreachable", async () => {
    // arrange
    const getWaitlist = new GetWaitlistUseCase({
      clock: fixedClock,
      featureFlags: createFeatureFlags({ WAITLIST_MODE: false }),
      logger: createLogger(),
      waitlist: createWaitlist(),
      waitlistEntries: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi
          .fn()
          .mockRejectedValue(new Error("database unavailable")),
      }),
    });

    // act
    const waitlist = await getWaitlist.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: null,
    });
  });
});

describe("JoinWaitlistUseCase", () => {
  it("normalizes the email before registering a reduced pricing signup", async () => {
    // arrange
    const waitlistEntries = createWaitlistEntries();
    const confirmation = createConfirmation();
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries,
    });

    // act
    const result = await joinWaitlist.execute({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(waitlistEntries.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(waitlistEntries.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(confirmation.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("returns before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const confirmation: WaitlistConfirmation = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<{ kind: "sent" }>((resolve) => {
            resolveConfirmation = () => resolve({ kind: "sent" });
          }),
      ),
    };
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries: createWaitlistEntries(),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = joinWaitlist.execute({ email: "eli@example.com" });
    const result = await Promise.race([
      resultPromise,
      new Promise<typeof timeoutResult>((resolve) => {
        setTimeout(() => resolve(timeoutResult), 0);
      }),
    ]);
    resolveConfirmation!();
    await resultPromise;

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(confirmation.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it.each(["a reported failure", "a thrown failure"] as const)(
    "does not log a submitted email when confirmation delivery ends in %s",
    async (failureMode) => {
      // arrange
      const email = "confirmation-privacy-regression@example.com";
      const logger = createLogger();
      const joinWaitlist = createJoinWaitlist({
        confirmation: {
          sendConfirmation: vi.fn(
            failureMode === "a reported failure"
              ? async () => ({ kind: "failed" as const })
              : async () => {
                  throw Object.assign(
                    new Error(`confirmation failed for ${email}`),
                    { params: [email] },
                  );
                },
          ),
        },
        logger,
        waitlistEntries: createWaitlistEntries(),
      });

      // act
      const result = await joinWaitlist.execute({ email });

      // assert
      expect(result).toEqual({
        status: "registered",
      });
      expect(logger.error).toHaveBeenCalledWith(
        "Waitlist confirmation email failed.",
        {
          errorCategory: "waitlist_confirmation_failure",
        },
      );
      expect(
        serializeCapturedLoggerArguments(logger.error.mock.calls),
      ).not.toContain(email);
    },
  );

  it("returns status-only without sending confirmation for a reduced-path duplicate", async () => {
    // arrange
    const confirmation = createConfirmation();
    const waitlistEntries = createWaitlistEntries({
      registerReducedPricingSignup: vi.fn().mockResolvedValue({
        status: "already_registered",
      }),
    });
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries,
    });

    // act
    const result = await joinWaitlist.execute({
      email: "eli@example.com",
    });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(waitlistEntries.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(confirmation.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a regular pricing signup when reduced pricing capacity is reached", async () => {
    // arrange
    const waitlistEntries = createWaitlistEntries({
      registerReducedPricingSignup: vi
        .fn()
        .mockResolvedValue({ status: "capacity_reached" }),
    });
    const confirmation = createConfirmation();
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries,
    });

    // act
    const result = await joinWaitlist.execute({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(waitlistEntries.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(waitlistEntries.registerRegularPricingSignup).toHaveBeenCalledWith({
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(confirmation.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("returns regular pricing registration before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const confirmation: WaitlistConfirmation = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<{ kind: "sent" }>((resolve) => {
            resolveConfirmation = () => resolve({ kind: "sent" });
          }),
      ),
    };
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries: createWaitlistEntries({
        registerReducedPricingSignup: vi
          .fn()
          .mockResolvedValue({ status: "capacity_reached" }),
      }),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = joinWaitlist.execute({ email: "eli@example.com" });
    const result = await Promise.race([
      resultPromise,
      new Promise<typeof timeoutResult>((resolve) => {
        setTimeout(() => resolve(timeoutResult), 0);
      }),
    ]);
    resolveConfirmation!();
    await resultPromise;

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(confirmation.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("maps duplicate regular pricing signups to an internal duplicate result", async () => {
    // arrange
    const confirmation = createConfirmation();
    const joinWaitlist = createJoinWaitlist({
      confirmation,
      logger: createLogger(),
      waitlistEntries: createWaitlistEntries({
        registerReducedPricingSignup: vi
          .fn()
          .mockResolvedValue({ status: "capacity_reached" }),
        registerRegularPricingSignup: vi.fn().mockResolvedValue({
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await joinWaitlist.execute({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(confirmation.sendConfirmation).not.toHaveBeenCalled();
  });
});
