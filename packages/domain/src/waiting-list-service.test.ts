import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WaitingListService,
  type WaitlistConfirmationService,
  type WaitlistConsentVersions,
  type WaitlistOffer,
  type WaitlistRepository,
} from "./waiting-list";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;
const consentVersions = {
  privacyPolicyVersion: "privacy-policy-test-v1",
  marketingConsentVersion: "marketing-consent-test-v1",
} satisfies WaitlistConsentVersions;

function createRepository(options?: Partial<WaitlistRepository>): WaitlistRepository {
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

function createConfirmationService(): WaitlistConfirmationService {
  return {
    sendConfirmation: vi.fn().mockResolvedValue(undefined),
  };
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

describe("WaitingListService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the deployment-configured mode independently of availability", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationService: createConfirmationService(),
      consentVersions,
      enabled: false,
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(0),
      }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "available",
    });
  });

  it("returns the delayed available waitlist snapshot", async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T10:12:00.000Z"));
    const repository = createRepository({
      countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(7),
    });
    const service = new WaitingListService({
      cap: 10,
      confirmationService: createConfirmationService(),
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository,
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "available",
    });
    expect(repository.countReducedPricingSignupsCreatedBefore).toHaveBeenCalledWith({
      campaignSlug: activeOffer.campaignSlug,
      createdBefore: new Date("2026-07-26T10:00:00.000Z"),
    });
  });

  it("returns the delayed limited waitlist snapshot", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationService: createConfirmationService(),
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(8),
      }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "limited",
    });
  });

  it("returns the delayed closed waitlist snapshot when deployment mode is disabled", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationService: createConfirmationService(),
      consentVersions,
      enabled: false,
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(10),
      }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "closed",
    });
  });

  it("returns an unavailable public snapshot when delayed observation fails", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationService: createConfirmationService(),
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignupsCreatedBefore: vi
          .fn()
          .mockRejectedValue(new Error("database unavailable")),
      }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: null,
    });
  });

  it("normalizes the email before registering a reduced pricing signup", async () => {
    // arrange
    const repository = createRepository();
    const confirmationService = createConfirmationService();
    const service = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository,
    });

    // act
    const result = await service.joinWaitlist({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(repository.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(confirmationService.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("returns before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const confirmationService: WaitlistConfirmationService = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveConfirmation = resolve;
          }),
      ),
    };
    const service = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository(),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = service.joinWaitlist({ email: "eli@example.com" });
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
    expect(confirmationService.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("does not log a submitted email when confirmation delivery fails", async () => {
    // arrange
    const email = "confirmation-privacy-regression@example.com";
    const nestedError = Object.assign(new Error(`nested failure for ${email}`), {
      params: [email],
    });
    const confirmationError = Object.assign(
      new Error(`confirmation failed for ${email}`),
      {
        cause: nestedError,
        params: [email],
      },
    );
    const errorLogger = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const service = new WaitingListService({
      cap: 10,
      confirmationService: {
        sendConfirmation: vi.fn().mockRejectedValue(confirmationError),
      },
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository(),
    });

    try {
      // act
      const result = await service.joinWaitlist({ email });

      // assert
      expect(result).toEqual({
        status: "registered",
      });
      expect(errorLogger).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          errorCategory: "waitlist_confirmation_failure",
        }),
      );
      expect(serializeCapturedLoggerArguments(errorLogger.mock.calls)).not.toContain(email);
    } finally {
      errorLogger.mockRestore();
    }
  });

  it("returns status-only without sending confirmation for a reduced-path duplicate", async () => {
    // arrange
    const confirmationService = createConfirmationService();
    const repository = createRepository({
      registerReducedPricingSignup: vi.fn().mockResolvedValue({
        status: "already_registered",
      }),
    });
    const duplicateService = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository,
    });

    // act
    const result = await duplicateService.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(repository.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(confirmationService.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a regular pricing signup when reduced pricing capacity is reached", async () => {
    // arrange
    const repository = createRepository({
      registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
    });
    const confirmationService = createConfirmationService();
    const service = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository,
    });

    // act
    const result = await service.joinWaitlist({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(repository.registerRegularPricingSignup).toHaveBeenCalledWith({
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(confirmationService.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("returns regular pricing registration before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const confirmationService: WaitlistConfirmationService = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveConfirmation = resolve;
          }),
      ),
    };
    const service = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
      }),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = service.joinWaitlist({ email: "eli@example.com" });
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
    expect(confirmationService.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("maps duplicate regular pricing signups to an internal duplicate result", async () => {
    // arrange
    const confirmationService = createConfirmationService();
    const service = new WaitingListService({
      cap: 10,
      confirmationService,
      consentVersions,
      enabled: true,
      offer: activeOffer,
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
        registerRegularPricingSignup: vi.fn().mockResolvedValue({
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await service.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(confirmationService.sendConfirmation).not.toHaveBeenCalled();
  });
});
