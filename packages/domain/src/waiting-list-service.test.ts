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
    countEntries: vi.fn().mockResolvedValue(0),
    reserveSpot: vi.fn().mockResolvedValue({
      status: "reserved",
      spotsRemaining: 9,
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
      repository: createRepository({ countEntries: vi.fn().mockResolvedValue(3) }),
    });

    await expect(service.getWaitlist()).resolves.toEqual({
      enabled: true,
      cap: 10,
      prospects: [],
      spotsRemaining: 7,
    });
  });

  it("normalizes the email before reserving a spot", async () => {
    const repository = createRepository();
    const sender = createSender();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: sender,
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository,
    });

    await expect(service.joinWaitlist({ email: " ELI@Example.COM " })).resolves.toEqual({
      status: "joined",
      spotsRemaining: 9,
    });
    expect(repository.reserveSpot).toHaveBeenCalledWith({
      cap: 10,
      normalizedEmail: "eli@example.com",
    });
    expect(sender.sendConfirmation).toHaveBeenCalledWith({ email: "eli@example.com" });
  });

  it("rejects invalid email before persistence", async () => {
    const repository = createRepository();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository,
    });

    await expect(service.joinWaitlist({ email: "not-an-email" })).resolves.toEqual({
      status: "invalid_email",
      message: "Please enter a valid email address.",
    });
    expect(repository.reserveSpot).not.toHaveBeenCalled();
  });

  it("rejects overly long email input before persistence", async () => {
    const repository = createRepository();
    const service = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository,
    });

    await expect(service.joinWaitlist({ email: `${"a".repeat(310)}@example.com` })).resolves.toEqual({
      status: "email_too_long",
      message: "Please enter an email address under 320 characters.",
    });
    expect(repository.reserveSpot).not.toHaveBeenCalled();
  });

  it("maps duplicate and capacity repository results to user-facing errors", async () => {
    const duplicateService = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository: createRepository({
        reserveSpot: vi.fn().mockResolvedValue({ status: "already_joined" }),
      }),
    });
    const fullService = new WaitingListService({
      cap: 10,
      confirmationSender: createSender(),
      featureFlagReader: createFeatureFlagReader({ WAITLIST_MODE: true }),
      repository: createRepository({
        reserveSpot: vi.fn().mockResolvedValue({ status: "spots_full" }),
      }),
    });

    await expect(duplicateService.joinWaitlist({ email: "eli@example.com" })).resolves.toEqual({
      status: "already_joined",
      message: "Looks like you're already on the list.",
    });
    await expect(fullService.joinWaitlist({ email: "eli@example.com" })).resolves.toEqual({
      status: "spots_full",
      message: "All 10 spots have been claimed.",
    });
  });
});
