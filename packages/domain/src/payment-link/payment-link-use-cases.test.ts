import { describe, expect, it, vi } from "vitest";

import {
  AssessmentCall,
  type AssessmentCallSnapshot,
} from "../assessment-call";
import type { PricingEligibility } from "../coaching-bundle";
import { EmailAddress } from "../email-address";
import type { FeatureFlagReader } from "../feature-flag";

import type { AssessmentCallReader } from "./assessment-call-reader";
import type { CallSalesState, CallSalesStates } from "./call-sales-states";
import type { CoachingSalesIncidents } from "./coaching-sales-incidents";
import type { CoachingSalesNotifications } from "./coaching-sales-notifications";
import { CoachingSalesWindow } from "./coaching-sales-window";
import { PaymentLink, type PaymentLinkState } from "./payment-link";
import type {
  PaymentLinks,
  PaymentLinkTokenGenerator,
  PaymentLinkTokenHasher,
} from "./payment-links";
import { ReadCallSalesStatesUseCase } from "./read-call-sales-states-use-case";
import { ResolvePaymentLinkUseCase } from "./resolve-payment-link-use-case";
import { SendPaymentLinkUseCase } from "./send-payment-link-use-case";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-payment-link-token";
const TOKEN_SHA256 = "b".repeat(64);
const NEW_LINK_ID = "link-2";

const call: AssessmentCallSnapshot = AssessmentCall.reconstitute({
  id: "call-1",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: null,
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: null,
  startsAt: new Date("2026-09-25T15:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-09-20T09:12:00.000Z"),
}).toSnapshot();

function clockAt(now: Date) {
  return { now: () => now };
}

function linkFor(props: {
  id: string;
  state: PaymentLinkState;
  expiresAt: Date;
}): PaymentLink {
  return PaymentLink.reconstitute({
    id: props.id,
    assessmentCallId: call.id,
    tokenSha256: TOKEN_SHA256,
    createdAt: new Date("2026-09-25T16:00:00.000Z"),
    expiresAt: props.expiresAt,
    state: props.state,
    paymentCustomerId: null,
  });
}

const usableLink = linkFor({
  id: "link-1",
  state: "valid",
  expiresAt: new Date("2026-10-25T16:00:00.000Z"),
});

function createIncidents(): CoachingSalesIncidents {
  return {
    salesModeReadFailed: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
    paymentEventRejected: vi.fn(),
  };
}

function salesWindowReading(featureFlags: FeatureFlagReader) {
  return new CoachingSalesWindow({
    featureFlags,
    incidents: createIncidents(),
  });
}

function openSalesWindow(): CoachingSalesWindow {
  return salesWindowReading({
    execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: false }),
  });
}

function closedSalesWindow(): CoachingSalesWindow {
  return salesWindowReading({
    execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
  });
}

function createCalls(
  found: AssessmentCallSnapshot | null,
): AssessmentCallReader {
  return { findById: vi.fn().mockResolvedValue(found) };
}

function createCallSalesStates(
  states: ReadonlyMap<string, CallSalesState>,
): CallSalesStates {
  return { forCalls: vi.fn().mockResolvedValue(states) };
}

function createPaymentLinks(found: PaymentLink | null): PaymentLinks {
  return {
    findByTokenSha256: vi.fn().mockResolvedValue(found),
    issue: vi.fn().mockImplementation(async (link) =>
      PaymentLink.reconstitute({
        ...link,
        id: NEW_LINK_ID,
        state: "valid",
        paymentCustomerId: null,
      }),
    ),
    voidOtherLinksOf: vi.fn().mockResolvedValue(undefined),
    void: vi.fn().mockResolvedValue(undefined),
    findPaymentCustomerForCall: vi.fn().mockResolvedValue(null),
    rememberPaymentCustomer: vi.fn().mockResolvedValue(undefined),
  };
}

function createPricingEligibility(
  tier: Awaited<ReturnType<PricingEligibility["tierForEmail"]>>,
): PricingEligibility {
  return { tierForEmail: vi.fn().mockResolvedValue(tier) };
}

function createNotifications(
  delivery: "sent" | "failed",
): CoachingSalesNotifications {
  return { sendPaymentLink: vi.fn().mockResolvedValue(delivery) };
}

function createTokenGenerator(): PaymentLinkTokenGenerator {
  return {
    create: vi
      .fn()
      .mockReturnValue({ rawToken: RAW_TOKEN, sha256: TOKEN_SHA256 }),
  };
}

function createTokenHasher(): PaymentLinkTokenHasher {
  return { sha256: vi.fn().mockReturnValue(TOKEN_SHA256) };
}

function sendPaymentLinkDependencies(
  overrides?: Partial<ConstructorParameters<typeof SendPaymentLinkUseCase>[0]>,
) {
  return {
    calls: createCalls(call),
    callSalesStates: createCallSalesStates(new Map()),
    clock: clockAt(NOW),
    incidents: createIncidents(),
    notifications: createNotifications("sent"),
    paymentLinks: createPaymentLinks(null),
    pricingEligibility: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    tokenGenerator: createTokenGenerator(),
    ...overrides,
  };
}

function resolvePaymentLinkDependencies(
  overrides?: Partial<
    ConstructorParameters<typeof ResolvePaymentLinkUseCase>[0]
  >,
) {
  return {
    calls: createCalls(call),
    callSalesStates: createCallSalesStates(
      new Map([[call.id, "payment-link-sent"]]),
    ),
    clock: clockAt(NOW),
    paymentLinks: createPaymentLinks(usableLink),
    pricingEligibility: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    tokenHasher: createTokenHasher(),
    ...overrides,
  };
}

describe("CoachingSalesWindow", () => {
  it.each([
    ["open once waitlist mode is off", { WAITLIST_MODE: false }, true],
    ["open when no waitlist mode is persisted", {}, true],
    [
      "closed while the site is in waitlist mode",
      { WAITLIST_MODE: true },
      false,
    ],
  ])("is %s", async (_label, flags, expected) => {
    // arrange
    const salesWindow = salesWindowReading({
      execute: vi.fn().mockResolvedValue(flags),
    });

    // act
    const open = await salesWindow.isOpen();

    // assert
    expect(open).toBe(expected);
  });
});

describe("SendPaymentLinkUseCase", () => {
  it("answers closed without touching anything while sales are closed", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      salesWindow: closedSalesWindow(),
    });
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(dependencies.calls.findById).not.toHaveBeenCalled();
    expect(dependencies.callSalesStates.forCalls).not.toHaveBeenCalled();
    expect(dependencies.tokenGenerator.create).not.toHaveBeenCalled();
    expect(dependencies.paymentLinks.issue).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendPaymentLink).not.toHaveBeenCalled();
  });

  it("answers closed and records the incident when the sales mode cannot be read", async () => {
    // arrange
    const failure = new Error("flags unavailable");
    const incidents = createIncidents();
    const dependencies = sendPaymentLinkDependencies({
      salesWindow: new CoachingSalesWindow({
        featureFlags: { execute: vi.fn().mockRejectedValue(failure) },
        incidents,
      }),
    });
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(incidents.salesModeReadFailed).toHaveBeenCalledWith(failure);
    expect(dependencies.calls.findById).not.toHaveBeenCalled();
  });

  it("answers call_not_found for an unknown call", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      calls: createCalls(null),
    });
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute({ assessmentCallId: "call-404" });

    // assert
    expect(result).toEqual({ status: "call_not_found" });
    expect(dependencies.calls.findById).toHaveBeenCalledWith("call-404");
    expect(dependencies.paymentLinks.issue).not.toHaveBeenCalled();
  });

  it.each([
    [
      "one millisecond before the call ends",
      new Date(call.endsAt.getTime() - 1),
      { status: "call_not_ended" },
    ],
    [
      "exactly when the call ends",
      call.endsAt,
      { status: "sent", email: call.visitorEmail },
    ],
  ])("answers by the call's end %s", async (_label, now, expected) => {
    // arrange
    const useCase = new SendPaymentLinkUseCase(
      sendPaymentLinkDependencies({ clock: clockAt(now) }),
    );

    // act
    const result = await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(result).toEqual(expected);
  });

  it("answers already_paid without issuing a link for a paid call", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      callSalesStates: createCallSalesStates(new Map([[call.id, "paid"]])),
    });
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(result).toEqual({ status: "already_paid" });
    expect(dependencies.callSalesStates.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(dependencies.tokenGenerator.create).not.toHaveBeenCalled();
    expect(dependencies.paymentLinks.issue).not.toHaveBeenCalled();
    expect(dependencies.notifications.sendPaymentLink).not.toHaveBeenCalled();
  });

  it("sends a 30-day link priced at the visitor's tier to the booking email", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      callSalesStates: createCallSalesStates(
        new Map([[call.id, "payment-link-sent"]]),
      ),
      pricingEligibility: createPricingEligibility("reduced"),
    });
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(dependencies.pricingEligibility.tierForEmail).toHaveBeenCalledWith(
      EmailAddress.normalize(call.visitorEmail),
    );
    expect(dependencies.paymentLinks.issue).toHaveBeenCalledWith({
      assessmentCallId: call.id,
      tokenSha256: TOKEN_SHA256,
      createdAt: NOW,
      expiresAt: new Date("2026-10-26T10:00:00.000Z"),
    });
    expect(dependencies.notifications.sendPaymentLink).toHaveBeenCalledWith({
      call,
      paymentLinkId: NEW_LINK_ID,
      rawToken: RAW_TOKEN,
      tier: "reduced",
    });
    expect(dependencies.paymentLinks.void).not.toHaveBeenCalled();
  });

  it("voids the call's earlier links, keeping the new one, only after the email is sent", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies();
    const useCase = new SendPaymentLinkUseCase(dependencies);

    // act
    await useCase.execute({ assessmentCallId: call.id });

    // assert
    expect(dependencies.paymentLinks.voidOtherLinksOf).toHaveBeenCalledWith(
      call.id,
      NEW_LINK_ID,
    );
    const [issued] = vi.mocked(dependencies.paymentLinks.issue).mock
      .invocationCallOrder;
    const [sent] = vi.mocked(dependencies.notifications.sendPaymentLink).mock
      .invocationCallOrder;
    const [voided] = vi.mocked(dependencies.paymentLinks.voidOtherLinksOf).mock
      .invocationCallOrder;
    expect(issued).toBeLessThan(sent!);
    expect(sent).toBeLessThan(voided!);
  });

  it.each<[string, CoachingSalesNotifications]>([
    ["reports a failed delivery", createNotifications("failed")],
    [
      "throws",
      {
        sendPaymentLink: vi.fn().mockRejectedValue(new Error("mail down")),
      },
    ],
  ])(
    "voids only the new link, keeps the earlier ones working and records the incident when the email %s",
    async (_label, notifications) => {
      // arrange
      const dependencies = sendPaymentLinkDependencies({ notifications });
      const useCase = new SendPaymentLinkUseCase(dependencies);

      // act
      const result = await useCase.execute({ assessmentCallId: call.id });

      // assert
      expect(result).toEqual({ status: "delivery_failed" });
      expect(vi.mocked(dependencies.paymentLinks.void).mock.calls).toEqual([
        [NEW_LINK_ID],
      ]);
      expect(dependencies.paymentLinks.voidOtherLinksOf).not.toHaveBeenCalled();
      expect(
        dependencies.incidents.paymentLinkEmailFailed,
      ).toHaveBeenCalledWith(call.id);
    },
  );
});

describe("ResolvePaymentLinkUseCase", () => {
  it("answers closed without a lookup while sales are closed", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies({
      salesWindow: closedSalesWindow(),
    });
    const useCase = new ResolvePaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(dependencies.paymentLinks.findByTokenSha256).not.toHaveBeenCalled();
  });

  it("answers invalid for an implausible token without hashing or a lookup", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies();
    const useCase = new ResolvePaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute("abcde");

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(dependencies.tokenHasher.sha256).not.toHaveBeenCalled();
    expect(dependencies.paymentLinks.findByTokenSha256).not.toHaveBeenCalled();
  });

  it.each<[string, PaymentLink | null]>([
    ["an unknown", null],
    ["an expired", linkFor({ id: "link-1", state: "valid", expiresAt: NOW })],
    [
      "a voided",
      linkFor({
        id: "link-1",
        state: "voided",
        expiresAt: usableLink.expiresAt,
      }),
    ],
    [
      "a spent",
      linkFor({
        id: "link-1",
        state: "spent",
        expiresAt: usableLink.expiresAt,
      }),
    ],
  ])("answers invalid for %s link", async (_label, found) => {
    // arrange
    const useCase = new ResolvePaymentLinkUseCase(
      resolvePaymentLinkDependencies({
        paymentLinks: createPaymentLinks(found),
      }),
    );

    // act
    const result = await useCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("answers invalid when the link's call no longer exists", async () => {
    // arrange
    const useCase = new ResolvePaymentLinkUseCase(
      resolvePaymentLinkDependencies({ calls: createCalls(null) }),
    );

    // act
    const result = await useCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("answers invalid for a still-valid link whose call is already paid", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies({
      callSalesStates: createCallSalesStates(new Map([[call.id, "paid"]])),
    });
    const useCase = new ResolvePaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(dependencies.callSalesStates.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(dependencies.pricingEligibility.tierForEmail).not.toHaveBeenCalled();
  });

  it("resolves a usable link with its call and the visitor's tier", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies({
      pricingEligibility: createPricingEligibility("reduced"),
    });
    const useCase = new ResolvePaymentLinkUseCase(dependencies);

    // act
    const result = await useCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({
      status: "valid",
      link: usableLink,
      call,
      tier: "reduced",
    });
    expect(dependencies.tokenHasher.sha256).toHaveBeenCalledWith(RAW_TOKEN);
    expect(dependencies.paymentLinks.findByTokenSha256).toHaveBeenCalledWith(
      TOKEN_SHA256,
    );
    expect(dependencies.calls.findById).toHaveBeenCalledWith(
      usableLink.assessmentCallId,
    );
    expect(dependencies.pricingEligibility.tierForEmail).toHaveBeenCalledWith(
      EmailAddress.normalize(call.visitorEmail),
    );
  });
});

describe("ReadCallSalesStatesUseCase", () => {
  it("answers the sales state of each requested call", async () => {
    // arrange
    const states = new Map<string, CallSalesState>([
      ["call-1", "held"],
      ["call-2", "payment-link-sent"],
      ["call-3", "paid"],
    ]);
    const callSalesStates = createCallSalesStates(states);
    const useCase = new ReadCallSalesStatesUseCase({ callSalesStates });

    // act
    const result = await useCase.execute(["call-1", "call-2", "call-3"]);

    // assert
    expect(result).toBe(states);
    expect(callSalesStates.forCalls).toHaveBeenCalledWith([
      "call-1",
      "call-2",
      "call-3",
    ]);
  });
});
