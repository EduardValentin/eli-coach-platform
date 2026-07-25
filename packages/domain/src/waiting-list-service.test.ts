import { afterEach, describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import {
  WaitingListService,
  type WaitlistConfirmationSender,
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

function createFeatureFlagReader(result: Record<string, boolean>): FeatureFlagReader {
  return {
    getFeatureFlags: vi.fn().mockResolvedValue(result),
  };
}

function createRepository(options?: Partial<WaitlistRepository>): WaitlistRepository {
  return {
    countReducedPricingSignups: vi.fn().mockResolvedValue(0),
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

function createSender(): WaitlistConfirmationSender {
  return {
    sendConfirmation: vi.fn().mockResolvedValue(undefined),
  };
}

describe("WaitingListService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the delayed available waitlist snapshot when WAITLIST_MODE is missing", async () => {
    // arrange
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-26T10:12:00.000Z"));
    const repository = createRepository({
      countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(7),
    });
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      consentVersions,
      featureFlagReader: createFeatureFlagReader({}),
      offer: activeOffer,
      repository,
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "available",
    });
    expect(repository.countReducedPricingSignupsCreatedBefore).toHaveBeenCalledWith({
      campaignSlug: activeOffer.campaignSlug,
      createdBefore: new Date("2026-07-26T10:00:00.000Z"),
    });
  });

  it("returns the delayed limited waitlist snapshot when WAITLIST_MODE is explicitly true", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
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

  it("returns the delayed closed waitlist snapshot when WAITLIST_MODE is explicitly false", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: false }),
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
      confirmationSender: createSender(),
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
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
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository,
    });

    // act
    const result = await service.joinWaitlist({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      pricing: "reduced",
      status: "registered",
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(repository.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("returns before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const sender: WaitlistConfirmationSender = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveConfirmation = resolve;
          }),
      ),
    };
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
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
      pricing: "reduced",
      status: "registered",
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("maps duplicate repository results to an internal duplicate result", async () => {
    // arrange
    const sender = createSender();
    const duplicateService = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({
          pricing: "reduced",
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await duplicateService.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      pricing: "reduced",
      status: "already_registered",
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });

  it("keeps a regular duplicate at regular pricing when reduced capacity reopens", async () => {
    // arrange
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({
          pricing: "regular",
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await service.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      pricing: "regular",
      status: "already_registered",
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });

  it("maps duplicate signups without reading the current reduced pricing count", async () => {
    // arrange
    const sender = createSender();
    const countReducedPricingSignups = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignups,
        registerReducedPricingSignup: vi.fn().mockResolvedValue({
          pricing: "reduced",
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await service.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      pricing: "reduced",
      status: "already_registered",
    });
    expect(countReducedPricingSignups).not.toHaveBeenCalled();
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a regular pricing signup when reduced pricing capacity is reached", async () => {
    // arrange
    const repository = createRepository({
      registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
    });
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository,
    });

    // act
    const result = await service.joinWaitlist({ email: " ELI@Example.COM " });

    // assert
    expect(result).toEqual({
      pricing: "regular",
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
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("returns regular pricing registration before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const sender: WaitlistConfirmationSender = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveConfirmation = resolve;
          }),
      ),
    };
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
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
      pricing: "regular",
      status: "registered",
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("maps duplicate regular pricing signups to an internal duplicate result", async () => {
    // arrange
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      consentVersions,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
        registerRegularPricingSignup: vi.fn().mockResolvedValue({
          pricing: "regular",
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await service.joinWaitlist({ email: "eli@example.com" });

    // assert
    expect(result).toEqual({
      pricing: "regular",
      status: "already_registered",
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });
});
