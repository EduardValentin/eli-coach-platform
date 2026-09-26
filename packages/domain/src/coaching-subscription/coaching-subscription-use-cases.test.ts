import { describe, expect, it, vi } from "vitest";

import {
  AssessmentCall,
  type AssessmentCallSnapshot,
} from "../assessment-call";
import type { PriceTier, PricingEligibility } from "../coaching-bundle";
import { Client } from "../client";
import { EmailAddress } from "../email-address";
import {
  CoachingSalesWindow,
  PaymentLink,
  type AssessmentCallReader,
  type CallSalesState,
  type CallSalesStates,
  type CoachingSalesIncidents,
  type PaymentLinks,
  type PaymentLinkState,
  type PaymentLinkTokenHasher,
} from "../payment-link";

import type { CheckoutSessions } from "./checkout-sessions";
import type { CoachingPurchases } from "./coaching-purchases";
import {
  CoachingSubscription,
  type CheckoutCompletion,
} from "./coaching-subscription";
import type { PaymentCheckout } from "./payment-checkout";
import { ReadCheckoutConfirmationUseCase } from "./read-checkout-confirmation-use-case";
import { RecordCheckoutCompletedUseCase } from "./record-checkout-completed-use-case";
import { StartCheckoutUseCase } from "./start-checkout-use-case";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-payment-link-token";
const TOKEN_SHA256 = "b".repeat(64);
const SUCCESS_URL = "https://evoa.example/coaching/paid";
const CANCEL_URL = "https://evoa.example/pay/raw-payment-link-token";

const clock = { now: () => NOW };

const call: AssessmentCallSnapshot = AssessmentCall.reconstitute({
  id: "call-1",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training around a desk job.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: new Date("2026-09-25T15:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-09-20T09:12:00.000Z"),
}).toSnapshot();

function linkIn(props: { state: PaymentLinkState; expiresAt: Date }) {
  return PaymentLink.reconstitute({
    id: "link-1",
    assessmentCallId: call.id,
    tokenSha256: TOKEN_SHA256,
    createdAt: new Date("2026-09-25T16:00:00.000Z"),
    expiresAt: props.expiresAt,
    state: props.state,
    paymentCustomerId: null,
  });
}

const usableLink = linkIn({
  state: "valid",
  expiresAt: new Date("2026-10-25T16:00:00.000Z"),
});

const completion: CheckoutCompletion = {
  checkoutSessionId: "cs_2",
  paymentCustomerId: "cus_1",
  paymentSubscriptionId: "sub_1",
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-26T10:05:00.000Z"),
  assessmentCallId: call.id,
  bundleId: "3-months",
  tier: "regular",
  startChoice: "waiting",
};

function createIncidents(): CoachingSalesIncidents {
  return {
    salesModeReadFailed: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
    paymentEventRejected: vi.fn(),
  };
}

function openSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    featureFlags: {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: false }),
    },
    incidents: createIncidents(),
  });
}

function closedSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    featureFlags: {
      execute: vi.fn().mockResolvedValue({ WAITLIST_MODE: true }),
    },
    incidents: createIncidents(),
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

function createPaymentLinks(options: {
  found: PaymentLink | null;
  paymentCustomerId: string | null;
}): PaymentLinks {
  return {
    findByTokenSha256: vi.fn().mockResolvedValue(options.found),
    issue: vi.fn(),
    voidOtherLinksOf: vi.fn(),
    void: vi.fn(),
    findPaymentCustomerForCall: vi
      .fn()
      .mockResolvedValue(options.paymentCustomerId),
    rememberPaymentCustomer: vi.fn().mockResolvedValue(undefined),
  };
}

function createPricingEligibility(tier: PriceTier): PricingEligibility {
  return { tierForEmail: vi.fn().mockResolvedValue(tier) };
}

function createTokenHasher(): PaymentLinkTokenHasher {
  return { sha256: vi.fn().mockReturnValue(TOKEN_SHA256) };
}

function createPaymentCheckout(
  completed: CheckoutCompletion | null,
): PaymentCheckout {
  return {
    createCustomer: vi.fn().mockResolvedValue({ id: "cus_new" }),
    createSession: vi
      .fn()
      .mockResolvedValue({ id: "cs_2", url: "https://pay.example/cs_2" }),
    expireSession: vi.fn().mockResolvedValue(undefined),
    findCompletedSession: vi.fn().mockResolvedValue(completed),
  };
}

function createCheckoutSessions(
  open: readonly { id: string }[],
): CheckoutSessions {
  return {
    remember: vi.fn().mockResolvedValue(undefined),
    findOpenForCall: vi.fn().mockResolvedValue(open),
    markExpired: vi.fn().mockResolvedValue(undefined),
  };
}

function createPurchases(
  outcome: Awaited<ReturnType<CoachingPurchases["recordCompletion"]>>,
): CoachingPurchases {
  return { recordCompletion: vi.fn().mockResolvedValue(outcome) };
}

function startCheckoutDependencies(
  overrides?: Partial<ConstructorParameters<typeof StartCheckoutUseCase>[0]>,
) {
  return {
    calls: createCalls(call),
    callSalesStates: createCallSalesStates(
      new Map([[call.id, "payment-link-sent"]]),
    ),
    checkoutSessions: createCheckoutSessions([]),
    clock,
    paymentCheckout: createPaymentCheckout(null),
    paymentLinks: createPaymentLinks({
      found: usableLink,
      paymentCustomerId: null,
    }),
    pricingEligibility: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    tokenHasher: createTokenHasher(),
    ...overrides,
  };
}

const startCommand = {
  rawToken: RAW_TOKEN,
  bundleId: "3-months",
  startChoice: "waiting",
  successUrl: SUCCESS_URL,
  cancelUrl: CANCEL_URL,
} as const;

describe("StartCheckoutUseCase", () => {
  it("answers closed without touching anything while sales are closed", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      salesWindow: closedSalesWindow(),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(dependencies.paymentLinks.findByTokenSha256).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createCustomer).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
  });

  it("answers invalid_link for an implausible token without a lookup", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute({ ...startCommand, rawToken: "abc" });

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(dependencies.tokenHasher.sha256).not.toHaveBeenCalled();
    expect(dependencies.paymentLinks.findByTokenSha256).not.toHaveBeenCalled();
  });

  it.each<[string, PaymentLink | null]>([
    ["an unknown", null],
    ["an expired", linkIn({ state: "valid", expiresAt: NOW })],
    ["a voided", linkIn({ state: "voided", expiresAt: usableLink.expiresAt })],
    ["a spent", linkIn({ state: "spent", expiresAt: usableLink.expiresAt })],
  ])("answers invalid_link for %s link", async (_label, found) => {
    // arrange
    const dependencies = startCheckoutDependencies({
      paymentLinks: createPaymentLinks({ found, paymentCustomerId: null }),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
  });

  it("answers unknown_bundle without creating a customer or a session", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute({
      ...startCommand,
      bundleId: "12-months",
    });

    // assert
    expect(result).toEqual({ status: "unknown_bundle" });
    expect(dependencies.paymentCheckout.createCustomer).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessions.remember).not.toHaveBeenCalled();
  });

  it("answers invalid_link when the link's call no longer exists", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      calls: createCalls(null),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
  });

  it("answers invalid_link for a still-valid link whose call is already paid, without provider calls", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      callSalesStates: createCallSalesStates(new Map([[call.id, "paid"]])),
      checkoutSessions: createCheckoutSessions([{ id: "cs_1" }]),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(dependencies.callSalesStates.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(dependencies.pricingEligibility.tierForEmail).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createCustomer).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.expireSession).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessions.markExpired).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
  });

  it("creates and remembers a payment customer on the call's first checkout", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    await useCase.execute(startCommand);

    // assert
    expect(
      dependencies.paymentLinks.findPaymentCustomerForCall,
    ).toHaveBeenCalledWith(call.id);
    expect(dependencies.paymentCheckout.createCustomer).toHaveBeenCalledWith({
      email: call.visitorEmail,
      assessmentCallId: call.id,
    });
    expect(
      dependencies.paymentLinks.rememberPaymentCustomer,
    ).toHaveBeenCalledWith(usableLink.id, "cus_new");
    expect(dependencies.paymentCheckout.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_new" }),
    );
  });

  it("reuses the call's payment customer on a later checkout", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      paymentLinks: createPaymentLinks({
        found: usableLink,
        paymentCustomerId: "cus_1",
      }),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    await useCase.execute(startCommand);

    // assert
    expect(dependencies.paymentCheckout.createCustomer).not.toHaveBeenCalled();
    expect(
      dependencies.paymentLinks.rememberPaymentCustomer,
    ).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_1" }),
    );
  });

  it("expires every open session of the call before creating the new one", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      checkoutSessions: createCheckoutSessions([
        { id: "cs_voided_link" },
        { id: "cs_current_link" },
      ]),
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    await useCase.execute(startCommand);

    // assert
    expect(dependencies.checkoutSessions.findOpenForCall).toHaveBeenCalledWith(
      call.id,
    );
    expect(
      vi.mocked(dependencies.paymentCheckout.expireSession).mock.calls,
    ).toEqual([["cs_voided_link"], ["cs_current_link"]]);
    expect(
      vi.mocked(dependencies.checkoutSessions.markExpired).mock.calls,
    ).toEqual([["cs_voided_link"], ["cs_current_link"]]);
    const expired = vi.mocked(dependencies.paymentCheckout.expireSession).mock
      .invocationCallOrder;
    const marked = vi.mocked(dependencies.checkoutSessions.markExpired).mock
      .invocationCallOrder;
    const [created] = vi.mocked(dependencies.paymentCheckout.createSession).mock
      .invocationCallOrder;
    expect(Math.max(...expired, ...marked)).toBeLessThan(created!);
  });

  it("answers invalid_link when one open session turns out paid, still expiring the others", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      checkoutSessions: createCheckoutSessions([
        { id: "cs_paid" },
        { id: "cs_unpaid" },
      ]),
      paymentCheckout: {
        ...createPaymentCheckout(null),
        findCompletedSession: vi
          .fn()
          .mockImplementation(async (id: string) =>
            id === "cs_paid"
              ? { ...completion, checkoutSessionId: "cs_paid" }
              : null,
          ),
      },
    });
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(
      vi.mocked(dependencies.paymentCheckout.expireSession).mock.calls,
    ).toEqual([["cs_paid"], ["cs_unpaid"]]);
    expect(
      vi.mocked(dependencies.checkoutSessions.markExpired).mock.calls,
    ).toEqual([["cs_unpaid"]]);
    expect(dependencies.paymentCheckout.createSession).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessions.remember).not.toHaveBeenCalled();
  });

  it("proceeds without expiring anything when the call has no open session", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const useCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await useCase.execute(startCommand);

    // assert
    expect(result).toEqual({
      status: "redirect",
      url: "https://pay.example/cs_2",
    });
    expect(dependencies.paymentCheckout.expireSession).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessions.markExpired).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckout.createSession).toHaveBeenCalledOnce();
  });

  it.each<[PriceTier, number]>([
    ["regular", 44700],
    ["reduced", 37500],
  ])(
    "opens a session for 3 months at the %s tier charging %i cents and redirects to it",
    async (tier, amountCents) => {
      // arrange
      const dependencies = startCheckoutDependencies({
        paymentLinks: createPaymentLinks({
          found: usableLink,
          paymentCustomerId: "cus_1",
        }),
        pricingEligibility: createPricingEligibility(tier),
      });
      const useCase = new StartCheckoutUseCase(dependencies);

      // act
      const result = await useCase.execute(startCommand);

      // assert
      expect(result).toEqual({
        status: "redirect",
        url: "https://pay.example/cs_2",
      });
      expect(dependencies.pricingEligibility.tierForEmail).toHaveBeenCalledWith(
        EmailAddress.normalize(call.visitorEmail),
      );
      expect(dependencies.paymentCheckout.createSession).toHaveBeenCalledWith({
        customerId: "cus_1",
        bundle: { id: "3-months", title: "3 Months", months: 3, amountCents },
        currency: "eur",
        metadata: {
          assessmentCallId: call.id,
          bundleId: "3-months",
          tier,
          startChoice: "waiting",
        },
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      expect(dependencies.checkoutSessions.remember).toHaveBeenCalledWith({
        id: "cs_2",
        paymentLinkId: usableLink.id,
        bundleId: "3-months",
        tier,
        amountCents,
        currency: "eur",
        startChoice: "waiting",
        createdAt: NOW,
      });
    },
  );
});

describe("RecordCheckoutCompletedUseCase", () => {
  it("records the client profile from the booking and the paid subscription, with no sales window consulted", async () => {
    // arrange
    const purchases = createPurchases("recorded");
    const useCase = new RecordCheckoutCompletedUseCase({
      calls: createCalls(call),
      clock,
      incidents: createIncidents(),
      purchases,
    });

    // act
    const result = await useCase.execute({ ...completion, eventId: "evt_1" });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(purchases.recordCompletion).toHaveBeenCalledWith({
      eventId: "evt_1",
      client: Client.fromAssessmentCall(call, NOW),
      subscription: CoachingSubscription.fromCompletedCheckout(completion),
    });
  });

  it("answers duplicate for a replayed event without raising an incident", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = new RecordCheckoutCompletedUseCase({
      calls: createCalls(call),
      clock,
      incidents,
      purchases: createPurchases("duplicate_event"),
    });

    // act
    const result = await useCase.execute({ ...completion, eventId: "evt_1" });

    // assert
    expect(result).toEqual({ status: "duplicate" });
    expect(incidents.paymentEventRejected).not.toHaveBeenCalled();
  });

  it("answers already_paid and reports the unrecorded charge when the call was already paid", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = new RecordCheckoutCompletedUseCase({
      calls: createCalls(call),
      clock,
      incidents,
      purchases: createPurchases("call_already_paid"),
    });

    // act
    const result = await useCase.execute({ ...completion, eventId: "evt_2" });

    // assert
    expect(result).toEqual({ status: "already_paid" });
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_2",
      reason: "call_already_paid",
    });
  });

  it("rejects the event and records nothing when the call does not exist", async () => {
    // arrange
    const incidents = createIncidents();
    const purchases = createPurchases("recorded");
    const calls = createCalls(null);
    const useCase = new RecordCheckoutCompletedUseCase({
      calls,
      clock,
      incidents,
      purchases,
    });

    // act
    const result = await useCase.execute({ ...completion, eventId: "evt_1" });

    // assert
    expect(result).toEqual({ status: "call_not_found" });
    expect(calls.findById).toHaveBeenCalledWith(completion.assessmentCallId);
    expect(incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
    expect(purchases.recordCompletion).not.toHaveBeenCalled();
  });
});

describe("ReadCheckoutConfirmationUseCase", () => {
  it("answers closed without a lookup while sales are closed", async () => {
    // arrange
    const paymentCheckout = createPaymentCheckout(completion);
    const useCase = new ReadCheckoutConfirmationUseCase({
      paymentCheckout,
      salesWindow: closedSalesWindow(),
    });

    // act
    const result = await useCase.execute("cs_2");

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(paymentCheckout.findCompletedSession).not.toHaveBeenCalled();
  });

  it("answers not_paid for a session that has not completed", async () => {
    // arrange
    const useCase = new ReadCheckoutConfirmationUseCase({
      paymentCheckout: createPaymentCheckout(null),
      salesWindow: openSalesWindow(),
    });

    // act
    const result = await useCase.execute("cs_2");

    // assert
    expect(result).toEqual({ status: "not_paid" });
  });

  it("confirms the paid bundle with the program waiting 14 days after payment", async () => {
    // arrange
    const paymentCheckout = createPaymentCheckout(completion);
    const useCase = new ReadCheckoutConfirmationUseCase({
      paymentCheckout,
      salesWindow: openSalesWindow(),
    });

    // act
    const result = await useCase.execute("cs_2");

    // assert
    expect(result).toEqual({
      status: "paid",
      bundleId: "3-months",
      tier: "regular",
      amountCents: 44700,
      startChoice: "waiting",
      paidAt: completion.paidAt,
      email: "ana@example.com",
      waitingStartsOn: new Date("2026-10-10T10:05:00.000Z"),
    });
    expect(paymentCheckout.findCompletedSession).toHaveBeenCalledWith("cs_2");
  });
});
