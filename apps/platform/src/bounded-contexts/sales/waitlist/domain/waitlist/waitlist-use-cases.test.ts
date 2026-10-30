import { describe, expect, it, vi } from "vitest";

import {
  createEmailAcceptance,
  type EmailSubaddressPolicy,
} from "~/shared/submission-checks/email-address";
import { GetWaitlistUseCase } from "./get-waitlist-use-case";
import { JoinWaitlistUseCase } from "./join-waitlist-use-case";
import {
  Waitlist,
  type WaitlistConsentVersions,
  type WaitlistOffer,
} from "./waitlist";
import type { WaitlistConfirmationPort } from "./waitlist-confirmation-port";
import type { WaitlistEntriesPort } from "./waitlist-entries-port";
import type { WaitlistModePort } from "./waitlist-mode-port";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} satisfies WaitlistOffer;
const consentVersions = {
  privacyPolicyVersion: "privacy-policy-test-v1",
  marketingConsentVersion: "marketing-consent-test-v1",
} satisfies WaitlistConsentVersions;
const fixedClock = { now: () => new Date("2026-07-30T12:00:00.000Z") };

function createWaitlistIncidents() {
  return {
    confirmationDeliveryFailed: vi.fn(),
    waitlistModeReadFailed: vi.fn(),
  };
}

function enabledWaitlistMode(): WaitlistModePort {
  return { isEnabled: vi.fn().mockResolvedValue(true) };
}

function disabledWaitlistMode(): WaitlistModePort {
  return { isEnabled: vi.fn().mockResolvedValue(false) };
}

function createWaitlist(): Waitlist {
  return Waitlist.configure({ offer: activeOffer });
}

function createWaitlistEntries(
  waitlistEntriesPort?: Partial<WaitlistEntriesPort>,
): WaitlistEntriesPort {
  return {
    countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(0),
    registerReducedPricingSignup: vi.fn().mockResolvedValue({
      status: "registered",
    }),
    registerRegularPricingSignup: vi.fn().mockResolvedValue({
      status: "registered",
    }),
    ...waitlistEntriesPort,
  };
}

function createConfirmation(): WaitlistConfirmationPort {
  return {
    sendConfirmation: vi.fn().mockResolvedValue({ kind: "sent" }),
  };
}

function createJoinWaitlist(options: {
  waitlistConfirmationPort: WaitlistConfirmationPort;
  emailSubaddresses?: EmailSubaddressPolicy;
  incidents: ReturnType<typeof createWaitlistIncidents>;
  waitlistEntriesPort: WaitlistEntriesPort;
}): JoinWaitlistUseCase {
  return new JoinWaitlistUseCase({
    waitlistConfirmationPort: options.waitlistConfirmationPort,
    consentVersionsPort: { current: () => consentVersions },
    emailAcceptancePort: createEmailAcceptance(
      options.emailSubaddresses ?? "allowed",
    ),
    waitlistIncidentsPort: options.incidents,
    waitlist: createWaitlist(),
    waitlistEntriesPort: options.waitlistEntriesPort,
  });
}

describe("GetWaitlistUseCase", () => {
  it("returns the persisted mode independently of availability", async () => {
    // arrange
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: disabledWaitlistMode(),
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(0),
      }),
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "available",
    });
  });

  it("uses safe waitlist mode without availability when feature flags are unreachable", async () => {
    // arrange
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: {
        isEnabled: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries(),
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: null,
    });
  });

  it("records a failed feature flag read", async () => {
    // arrange
    const incidents = createWaitlistIncidents();
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: {
        isEnabled: vi.fn().mockRejectedValue(new Error("database unavailable")),
      },
      waitlistIncidentsPort: incidents,
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries(),
    });

    // act
    await getWaitlistUseCase.execute();

    // assert
    expect(incidents.waitlistModeReadFailed).toHaveBeenCalledWith();
  });

  it("records nothing when the feature flags are read", async () => {
    // arrange
    const incidents = createWaitlistIncidents();
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: enabledWaitlistMode(),
      waitlistIncidentsPort: incidents,
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries(),
    });

    // act
    await getWaitlistUseCase.execute();

    // assert
    expect(incidents.waitlistModeReadFailed).not.toHaveBeenCalled();
  });

  it("returns the delayed available waitlist snapshot", async () => {
    // arrange
    const waitlistEntriesPort = createWaitlistEntries({
      countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(7),
    });
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: { now: () => new Date("2026-07-26T10:12:00.000Z") },
      waitlistModePort: enabledWaitlistMode(),
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort,
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "available",
    });
    expect(
      waitlistEntriesPort.countReducedPricingSignupsCreatedBefore,
    ).toHaveBeenCalledWith({
      campaignSlug: activeOffer.campaignSlug,
      createdBefore: new Date("2026-07-26T10:00:00.000Z"),
    });
  });

  it("returns the delayed limited waitlist snapshot", async () => {
    // arrange
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: enabledWaitlistMode(),
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(8),
      }),
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: true,
      offer: activeOffer,
      availability: "limited",
    });
  });

  it("returns the delayed closed waitlist snapshot when persisted mode is disabled", async () => {
    // arrange
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: disabledWaitlistMode(),
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi.fn().mockResolvedValue(10),
      }),
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

    // assert
    expect(waitlist).toEqual({
      enabled: false,
      offer: activeOffer,
      availability: "closed",
    });
  });

  it("retains the persisted mode when delayed availability is unreachable", async () => {
    // arrange
    const getWaitlistUseCase = new GetWaitlistUseCase({
      clockPort: fixedClock,
      waitlistModePort: disabledWaitlistMode(),
      waitlistIncidentsPort: createWaitlistIncidents(),
      waitlist: createWaitlist(),
      waitlistEntriesPort: createWaitlistEntries({
        countReducedPricingSignupsCreatedBefore: vi
          .fn()
          .mockRejectedValue(new Error("database unavailable")),
      }),
    });

    // act
    const waitlist = await getWaitlistUseCase.execute();

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
    const waitlistEntriesPort = createWaitlistEntries();
    const waitlistConfirmationPort = createConfirmation();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: " ELI@Example.COM ",
    });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(
      waitlistEntriesPort.registerReducedPricingSignup,
    ).toHaveBeenCalledWith({
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(
      waitlistEntriesPort.registerRegularPricingSignup,
    ).not.toHaveBeenCalled();
    expect(waitlistConfirmationPort.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it("returns before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const waitlistConfirmationPort: WaitlistConfirmationPort = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<{ kind: "sent" }>((resolve) => {
            resolveConfirmation = () => resolve({ kind: "sent" });
          }),
      ),
    };
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort: createWaitlistEntries(),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = joinWaitlistUseCase.execute({
      email: "eli@example.com",
    });
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
    expect(waitlistConfirmationPort.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "reduced",
    });
  });

  it.each(["a reported failure", "a thrown failure"] as const)(
    "keeps the registration and reports the incident when confirmation delivery ends in %s",
    async (failureMode) => {
      // arrange
      const incidents = createWaitlistIncidents();
      const joinWaitlistUseCase = createJoinWaitlist({
        waitlistConfirmationPort: {
          sendConfirmation: vi.fn(
            failureMode === "a reported failure"
              ? async () => ({ kind: "failed" as const })
              : async () => {
                  throw new Error("confirmation failed");
                },
          ),
        },
        incidents,
        waitlistEntriesPort: createWaitlistEntries(),
      });

      // act
      const result = await joinWaitlistUseCase.execute({
        email: "eli@example.com",
      });

      // assert
      expect(result).toEqual({
        status: "registered",
      });
      expect(incidents.confirmationDeliveryFailed).toHaveBeenCalledWith();
    },
  );

  it("returns status-only without sending confirmation for a reduced-path duplicate", async () => {
    // arrange
    const waitlistConfirmationPort = createConfirmation();
    const waitlistEntriesPort = createWaitlistEntries({
      registerReducedPricingSignup: vi.fn().mockResolvedValue({
        status: "already_registered",
      }),
    });
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: "eli@example.com",
    });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(
      waitlistEntriesPort.registerRegularPricingSignup,
    ).not.toHaveBeenCalled();
    expect(waitlistConfirmationPort.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a regular pricing signup when reduced pricing capacity is reached", async () => {
    // arrange
    const waitlistEntriesPort = createWaitlistEntries({
      registerReducedPricingSignup: vi
        .fn()
        .mockResolvedValue({ status: "capacity_reached" }),
    });
    const waitlistConfirmationPort = createConfirmation();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: " ELI@Example.COM ",
    });

    // assert
    expect(result).toEqual({
      status: "registered",
    });
    expect(
      waitlistEntriesPort.registerReducedPricingSignup,
    ).toHaveBeenCalledWith({
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(
      waitlistEntriesPort.registerRegularPricingSignup,
    ).toHaveBeenCalledWith({
      consentVersions,
      normalizedEmail: "eli@example.com",
      offer: activeOffer,
    });
    expect(waitlistConfirmationPort.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("returns regular pricing registration before confirmation delivery completes", async () => {
    // arrange
    let resolveConfirmation: () => void;
    const waitlistConfirmationPort: WaitlistConfirmationPort = {
      sendConfirmation: vi.fn(
        () =>
          new Promise<{ kind: "sent" }>((resolve) => {
            resolveConfirmation = () => resolve({ kind: "sent" });
          }),
      ),
    };
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort: createWaitlistEntries({
        registerReducedPricingSignup: vi
          .fn()
          .mockResolvedValue({ status: "capacity_reached" }),
      }),
    });
    const timeoutResult = Symbol("timeout");

    // act
    const resultPromise = joinWaitlistUseCase.execute({
      email: "eli@example.com",
    });
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
    expect(waitlistConfirmationPort.sendConfirmation).toHaveBeenCalledWith({
      email: "eli@example.com",
      offer: activeOffer,
      pricing: "regular",
    });
  });

  it("maps duplicate regular pricing signups to an internal duplicate result", async () => {
    // arrange
    const waitlistConfirmationPort = createConfirmation();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort: createWaitlistEntries({
        registerReducedPricingSignup: vi
          .fn()
          .mockResolvedValue({ status: "capacity_reached" }),
        registerRegularPricingSignup: vi.fn().mockResolvedValue({
          status: "already_registered",
        }),
      }),
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: "eli@example.com",
    });

    // assert
    expect(result).toEqual({
      status: "already_registered",
    });
    expect(waitlistConfirmationPort.sendConfirmation).not.toHaveBeenCalled();
  });

  it("refuses a subaddressed email without registering or confirming anything", async () => {
    // arrange
    const waitlistConfirmationPort = createConfirmation();
    const waitlistEntriesPort = createWaitlistEntries();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort,
      emailSubaddresses: "refused",
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: "Eli+Launch@Example.com",
    });

    // assert
    expect(result).toEqual({ status: "subaddress_refused" });
    expect(
      waitlistEntriesPort.registerReducedPricingSignup,
    ).not.toHaveBeenCalled();
    expect(
      waitlistEntriesPort.registerRegularPricingSignup,
    ).not.toHaveBeenCalled();
    expect(waitlistConfirmationPort.sendConfirmation).not.toHaveBeenCalled();
  });

  it("registers a main address where subaddresses are refused", async () => {
    // arrange
    const waitlistEntriesPort = createWaitlistEntries();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort: createConfirmation(),
      emailSubaddresses: "refused",
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: "eli@example.com",
    });

    // assert
    expect(result).toEqual({ status: "registered" });
  });

  it("registers a subaddressed email as entered where subaddresses are allowed", async () => {
    // arrange
    const waitlistEntriesPort = createWaitlistEntries();
    const joinWaitlistUseCase = createJoinWaitlist({
      waitlistConfirmationPort: createConfirmation(),
      emailSubaddresses: "allowed",
      incidents: createWaitlistIncidents(),
      waitlistEntriesPort,
    });

    // act
    const result = await joinWaitlistUseCase.execute({
      email: "Eli+Launch@Example.com",
    });

    // assert
    expect(result).toEqual({ status: "registered" });
    expect(
      waitlistEntriesPort.registerReducedPricingSignup,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ normalizedEmail: "eli+launch@example.com" }),
    );
  });
});
