import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import {
  WaitingListService,
  type WaitlistConfirmationSender,
  type WaitlistOffer,
  type WaitlistRepository,
} from "./waiting-list";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;

function createFeatureFlagReader(result: Record<string, boolean>): FeatureFlagReader {
  return {
    getFeatureFlags: vi.fn().mockResolvedValue(result),
  };
}

function createRepository(options?: Partial<WaitlistRepository>): WaitlistRepository {
  return {
    countReducedPricingSignups: vi.fn().mockResolvedValue(0),
    registerReducedPricingSignup: vi.fn().mockResolvedValue({
      status: "registered",
      spotsRemaining: 9,
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
  it("returns disabled waitlist data when WAITLIST_MODE is missing", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({}),
      offer: activeOffer,
      repository: createRepository({ countReducedPricingSignups: vi.fn().mockResolvedValue(3) }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      cap: 10,
      offer: activeOffer,
      spotsRemaining: 7,
    });
  });

  it("returns enabled waitlist data when WAITLIST_MODE is explicitly true", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({ countReducedPricingSignups: vi.fn().mockResolvedValue(3) }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      cap: 10,
      offer: activeOffer,
      spotsRemaining: 7,
    });
  });

  it("returns disabled waitlist data when WAITLIST_MODE is explicitly false", async () => {
    // arrange
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: false }),
      offer: activeOffer,
      repository: createRepository({ countReducedPricingSignups: vi.fn().mockResolvedValue(3) }),
    });

    // act
    const waitlist = await service.getWaitlist();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      cap: 10,
      offer: activeOffer,
      spotsRemaining: 7,
    });
  });

  it("normalizes the email before registering a reduced pricing signup", async () => {
    const repository = createRepository({
      countReducedPricingSignups: vi.fn().mockResolvedValue(10),
    });
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository,
    });

    await expect(service.joinWaitlist({ email: " ELI@Example.COM " })).resolves.toEqual({
      offer: activeOffer,
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
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
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository(),
    });
    const timeoutResult = Symbol("timeout");

    const resultPromise = service.joinWaitlist({ email: "eli@example.com" });
    const result = await Promise.race([
      resultPromise,
      new Promise<typeof timeoutResult>((resolve) => {
        setTimeout(() => resolve(timeoutResult), 0);
      }),
    ]);
    resolveConfirmation!();
    await resultPromise;

    expect(result).toEqual({
      offer: activeOffer,
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("maps duplicate repository results to an internal duplicate result", async () => {
    const sender = createSender();
    const duplicateService = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignups: vi.fn().mockResolvedValue(4),
        registerReducedPricingSignup: vi.fn().mockResolvedValue({
          pricing: "reduced",
          status: "already_registered",
        }),
      }),
    });

    await expect(duplicateService.joinWaitlist({ email: "eli@example.com" })).resolves.toEqual({
      offer: activeOffer,
      pricing: "reduced",
      status: "already_registered",
      spotsRemaining: 5,
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });

  it("does not map duplicate signups to success when reduced pricing count fails", async () => {
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignups: vi.fn().mockRejectedValue(new Error("database unavailable")),
        registerReducedPricingSignup: vi.fn().mockResolvedValue({
          pricing: "reduced",
          status: "already_registered",
        }),
      }),
    });

    await expect(service.joinWaitlist({ email: "eli@example.com" })).rejects.toThrow(
      "database unavailable",
    );
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a regular pricing signup when reduced pricing capacity is reached", async () => {
    const repository = createRepository({
      countReducedPricingSignups: vi.fn().mockResolvedValue(10),
      registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
    });
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository,
    });

    await expect(service.joinWaitlist({ email: " ELI@Example.COM " })).resolves.toEqual({
      offer: activeOffer,
      pricing: "regular",
      status: "registered",
      spotsRemaining: 0,
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(repository.registerRegularPricingSignup).toHaveBeenCalledWith({
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
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignups: vi.fn().mockResolvedValue(10),
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
      }),
    });
    const timeoutResult = Symbol("timeout");

    const resultPromise = service.joinWaitlist({ email: "eli@example.com" });
    const result = await Promise.race([
      resultPromise,
      new Promise<typeof timeoutResult>((resolve) => {
        setTimeout(() => resolve(timeoutResult), 0);
      }),
    ]);
    resolveConfirmation!();
    await resultPromise;

    expect(result).toEqual({
      offer: activeOffer,
      pricing: "regular",
      status: "registered",
      spotsRemaining: 0,
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("maps duplicate regular pricing signups to an internal duplicate result", async () => {
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      offer: activeOffer,
      repository: createRepository({
        countReducedPricingSignups: vi.fn().mockResolvedValue(10),
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "capacity_reached" }),
        registerRegularPricingSignup: vi.fn().mockResolvedValue({
          pricing: "regular",
          status: "already_registered",
        }),
      }),
    });

    await expect(service.joinWaitlist({ email: "eli@example.com" })).resolves.toEqual({
      offer: activeOffer,
      pricing: "regular",
      status: "already_registered",
      spotsRemaining: 0,
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });
});
