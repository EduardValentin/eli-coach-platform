import { describe, expect, it, vi } from "vitest";

import type { FeatureFlagReader } from "./feature-flags";
import {
  WaitingListService,
  type WaitlistConfirmationSender,
  type WaitlistRepository,
} from "./waiting-list";

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
  it("returns an enabled snapshot unless WAITLIST_MODE is explicitly false", async () => {
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({}),
      repository: createRepository({ countReducedPricingSignups: vi.fn().mockResolvedValue(3) }),
    });

    await expect(service.getWaitlist()).resolves.toEqual({
      enabled: true,
      cap: 10,
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
      repository,
    });

    await expect(service.joinWaitlist({ email: " ELI@Example.COM " })).resolves.toEqual({
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      normalizedEmail: "eli@example.com",
    });
    expect(repository.registerRegularPricingSignup).not.toHaveBeenCalled();
    expect(sender.sendConfirmation).toHaveBeenCalledWith({ email: "eli@example.com" });
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
      pricing: "reduced",
      status: "registered",
      spotsRemaining: 9,
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({ email: "eli@example.com" });
  });

  it("maps duplicate repository results to an already registered error", async () => {
    const duplicateService = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository: createRepository({
        registerReducedPricingSignup: vi.fn().mockResolvedValue({ status: "already_registered" }),
      }),
    });

    await expect(duplicateService.joinWaitlist({ email: "eli@example.com" })).resolves.toEqual({
      status: "already_registered",
      message: "Good news — you're already on the list. We'll be in touch when doors open.",
    });
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
      repository,
    });

    await expect(service.joinWaitlist({ email: " ELI@Example.COM " })).resolves.toEqual({
      pricing: "regular",
      status: "registered",
      spotsRemaining: 0,
    });
    expect(repository.registerReducedPricingSignup).toHaveBeenCalledWith({
      cap: 10,
      normalizedEmail: "eli@example.com",
    });
    expect(repository.registerRegularPricingSignup).toHaveBeenCalledWith({
      normalizedEmail: "eli@example.com",
    });
    expect(sender.sendConfirmation).not.toHaveBeenCalled();
  });
});
