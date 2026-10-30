import { describe, expect, it, vi } from "vitest";

import type { EndedCallsPort, SalesCall } from "../payment-link";
import type { PriceTier, PricingEligibilityPort } from "../coaching-bundle";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import {
  CoachingSalesWindow,
  PaymentLink,
  type CallSalesStatesPort,
  type CoachingSalesIncidentsPort,
  type PaymentLinksPort,
  type PaymentLinkState,
  type PaymentLinkTokenHasherPort,
} from "../payment-link";

import {
  CallAlreadyPaid,
  type CheckoutPurchase,
  type RecordedCheckoutPurchase,
} from "./checkout-purchase";
import type { CheckoutSessionsPort } from "./checkout-sessions-port";
import type { CoachingPurchasesPort } from "./coaching-purchases-port";
import type { CheckoutCompletion } from "./coaching-subscription";
import type { CoachingSubscriptionIncidentsPort } from "./coaching-subscription-incidents-port";
import type {
  PaidClientAdmissionPort,
  PaidClientAdmissionOutcome,
  PaidClientIntake,
} from "./paid-client-admission-port";
import type { PaymentCheckoutPort } from "./payment-checkout-port";
import type { PaymentEventLedgerPort } from "./payment-event-ledger-port";
import type { PaymentSubscriptionsPort } from "./payment-subscriptions-port";
import { PurchasedSubscription } from "./purchased-subscription";
import { ReadCheckoutConfirmationUseCase } from "./read-checkout-confirmation-use-case";
import { FinishCheckoutPurchaseUseCase } from "./finish-checkout-purchase-use-case";
import { ReadCheckoutPurchaseUseCase } from "./read-checkout-purchase-use-case";
import { RecordCheckoutPurchaseUseCase } from "./record-checkout-purchase-use-case";
import { StartCheckoutUseCase } from "./start-checkout-use-case";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-payment-link-token";
const TOKEN_SHA256 = "b".repeat(64);
const SUCCESS_URL = "https://evoa.example/coaching/paid";
const CANCEL_URL = "https://evoa.example/pay/raw-payment-link-token";

const clock = { now: () => NOW };

const call: SalesCall = {
  id: "call-1",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  visitorTimeZone: "Europe/Bucharest",
  endsAt: new Date("2026-09-25T15:30:00.000Z"),
};

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
  paymentIntentId: "pi_1",
  amountCents: 44700,
  currency: "eur",
  customerEmail: "ana@example.com",
  paidAt: new Date("2026-09-26T10:05:00.000Z"),
  assessmentCallId: call.id,
  bundleId: "3-months",
  tier: "regular",
  startChoice: "waiting",
};

function createIncidents(): CoachingSalesIncidentsPort {
  return {
    salesModeReadFailed: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
  };
}

function openSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    coachingSalesIncidentsPort: createIncidents(),
    waitlistModePort: { isEnabled: vi.fn().mockResolvedValue(false) },
  });
}

function closedSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    coachingSalesIncidentsPort: createIncidents(),
    waitlistModePort: { isEnabled: vi.fn().mockResolvedValue(true) },
  });
}

function createCalls(found: SalesCall | null): EndedCallsPort {
  return { findById: vi.fn().mockResolvedValue(found) };
}

function createCallSalesStates(
  states: Awaited<ReturnType<CallSalesStatesPort["forCalls"]>>,
): CallSalesStatesPort {
  return { forCalls: vi.fn().mockResolvedValue(states) };
}

function createPaymentLinks(options: {
  found: PaymentLink | null;
  paymentCustomerId: string | null;
}): PaymentLinksPort {
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

function createPricingEligibility(tier: PriceTier): PricingEligibilityPort {
  return {
    tierForEmail: vi.fn().mockResolvedValue(tier),
    tiersForEmails: vi.fn(),
  };
}

function createTokenHasher(): PaymentLinkTokenHasherPort {
  return { sha256: vi.fn().mockReturnValue(TOKEN_SHA256) };
}

function createPaymentCheckout(
  completed: CheckoutCompletion | null,
): PaymentCheckoutPort {
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
): CheckoutSessionsPort {
  return {
    remember: vi.fn().mockResolvedValue(undefined),
    findOpenForCall: vi.fn().mockResolvedValue(open),
    markExpired: vi.fn().mockResolvedValue(undefined),
  };
}

const PAID_CLIENT_ID = "client-1";

const CLIENT_RECORDED_EARLIER_ID = "client-recorded-earlier";

function createPurchases() {
  return {
    insertSubscription: vi.fn().mockResolvedValue(undefined),
    spendPaymentLink: vi.fn().mockResolvedValue(undefined),
    findClientIdForCall: vi.fn().mockResolvedValue(CLIENT_RECORDED_EARLIER_ID),
  } satisfies CoachingPurchasesPort;
}

function createAdmission(admitted: PaidClientAdmissionOutcome) {
  return {
    admit: vi.fn().mockResolvedValue(admitted),
    invite: vi.fn().mockResolvedValue(undefined),
  } satisfies PaidClientAdmissionPort;
}

function createPaymentEventLedger(outcome: "recorded" | "duplicate") {
  return {
    record: vi.fn().mockResolvedValue(outcome),
  } satisfies PaymentEventLedgerPort;
}

function startCheckoutDependencies(
  overrides?: Partial<ConstructorParameters<typeof StartCheckoutUseCase>[0]>,
) {
  return {
    endedCallsPort: createCalls(call),
    callSalesStatesPort: createCallSalesStates(
      new Map([[call.id, { state: "payment-link-sent", clientId: null }]]),
    ),
    checkoutSessionsPort: createCheckoutSessions([]),
    clockPort: clock,
    emailAcceptancePort: createEmailAcceptance("allowed"),
    paymentCheckoutPort: createPaymentCheckout(null),
    paymentLinksPort: createPaymentLinks({
      found: usableLink,
      paymentCustomerId: null,
    }),
    pricingEligibilityPort: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    paymentLinkTokenHasherPort: createTokenHasher(),
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
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(
      dependencies.paymentLinksPort.findByTokenSha256,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createCustomer,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
  });

  it("answers invalid_link for an implausible token without a lookup", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute({
      ...startCommand,
      rawToken: "abc",
    });

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(
      dependencies.paymentLinkTokenHasherPort.sha256,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentLinksPort.findByTokenSha256,
    ).not.toHaveBeenCalled();
  });

  it.each<[string, PaymentLink | null]>([
    ["an unknown", null],
    ["an expired", linkIn({ state: "valid", expiresAt: NOW })],
    ["a voided", linkIn({ state: "voided", expiresAt: usableLink.expiresAt })],
    ["a spent", linkIn({ state: "spent", expiresAt: usableLink.expiresAt })],
  ])("answers invalid_link for %s link", async (_label, found) => {
    // arrange
    const dependencies = startCheckoutDependencies({
      paymentLinksPort: createPaymentLinks({ found, paymentCustomerId: null }),
    });
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
  });

  it("answers unknown_bundle without creating a customer or a session", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute({
      ...startCommand,
      bundleId: "12-months",
    });

    // assert
    expect(result).toEqual({ status: "unknown_bundle" });
    expect(
      dependencies.paymentCheckoutPort.createCustomer,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessionsPort.remember).not.toHaveBeenCalled();
  });

  it("answers invalid_link when the link's call no longer exists", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      endedCallsPort: createCalls(null),
    });
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
  });

  it("answers invalid_link for a still-valid link whose call is already paid, without provider calls", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      callSalesStatesPort: createCallSalesStates(
        new Map([[call.id, { state: "paid", clientId: "client-1" }]]),
      ),
      checkoutSessionsPort: createCheckoutSessions([{ id: "cs_1" }]),
    });
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(dependencies.callSalesStatesPort.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(
      dependencies.pricingEligibilityPort.tierForEmail,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createCustomer,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.expireSession,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.checkoutSessionsPort.markExpired,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
  });

  it("creates and remembers a payment customer on the call's first checkout", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(
      dependencies.paymentLinksPort.findPaymentCustomerForCall,
    ).toHaveBeenCalledWith(call.id);
    expect(
      dependencies.paymentCheckoutPort.createCustomer,
    ).toHaveBeenCalledWith({
      email: call.visitorEmail,
      assessmentCallId: call.id,
    });
    expect(
      dependencies.paymentLinksPort.rememberPaymentCustomer,
    ).toHaveBeenCalledWith(usableLink.id, "cus_new");
    expect(dependencies.paymentCheckoutPort.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_new" }),
    );
  });

  it("reuses the call's payment customer on a later checkout", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      paymentLinksPort: createPaymentLinks({
        found: usableLink,
        paymentCustomerId: "cus_1",
      }),
    });
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(
      dependencies.paymentCheckoutPort.createCustomer,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentLinksPort.rememberPaymentCustomer,
    ).not.toHaveBeenCalled();
    expect(dependencies.paymentCheckoutPort.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_1" }),
    );
  });

  it("expires every open session of the call before creating the new one", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      checkoutSessionsPort: createCheckoutSessions([
        { id: "cs_voided_link" },
        { id: "cs_current_link" },
      ]),
    });
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(
      dependencies.checkoutSessionsPort.findOpenForCall,
    ).toHaveBeenCalledWith(call.id);
    expect(
      vi.mocked(dependencies.paymentCheckoutPort.expireSession).mock.calls,
    ).toEqual([["cs_voided_link"], ["cs_current_link"]]);
    expect(
      vi.mocked(dependencies.checkoutSessionsPort.markExpired).mock.calls,
    ).toEqual([["cs_voided_link"], ["cs_current_link"]]);
    const expired = vi.mocked(dependencies.paymentCheckoutPort.expireSession)
      .mock.invocationCallOrder;
    const marked = vi.mocked(dependencies.checkoutSessionsPort.markExpired).mock
      .invocationCallOrder;
    const [created] = vi.mocked(dependencies.paymentCheckoutPort.createSession)
      .mock.invocationCallOrder;
    expect(Math.max(...expired, ...marked)).toBeLessThan(created!);
  });

  it("answers invalid_link when one open session turns out paid, still expiring the others", async () => {
    // arrange
    const dependencies = startCheckoutDependencies({
      checkoutSessionsPort: createCheckoutSessions([
        { id: "cs_paid" },
        { id: "cs_unpaid" },
      ]),
      paymentCheckoutPort: {
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
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({ status: "invalid_link" });
    expect(
      vi.mocked(dependencies.paymentCheckoutPort.expireSession).mock.calls,
    ).toEqual([["cs_paid"], ["cs_unpaid"]]);
    expect(
      vi.mocked(dependencies.checkoutSessionsPort.markExpired).mock.calls,
    ).toEqual([["cs_unpaid"]]);
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).not.toHaveBeenCalled();
    expect(dependencies.checkoutSessionsPort.remember).not.toHaveBeenCalled();
  });

  it("proceeds without expiring anything when the call has no open session", async () => {
    // arrange
    const dependencies = startCheckoutDependencies();
    const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

    // act
    const result = await startCheckoutUseCase.execute(startCommand);

    // assert
    expect(result).toEqual({
      status: "redirect",
      url: "https://pay.example/cs_2",
    });
    expect(
      dependencies.paymentCheckoutPort.expireSession,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.checkoutSessionsPort.markExpired,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentCheckoutPort.createSession,
    ).toHaveBeenCalledOnce();
  });

  it.each<[PriceTier, number]>([
    ["regular", 44700],
    ["reduced", 37500],
  ])(
    "opens a session for 3 months at the %s tier charging %i cents and redirects to it",
    async (tier, amountCents) => {
      // arrange
      const dependencies = startCheckoutDependencies({
        paymentLinksPort: createPaymentLinks({
          found: usableLink,
          paymentCustomerId: "cus_1",
        }),
        pricingEligibilityPort: createPricingEligibility(tier),
      });
      const startCheckoutUseCase = new StartCheckoutUseCase(dependencies);

      // act
      const result = await startCheckoutUseCase.execute(startCommand);

      // assert
      expect(result).toEqual({
        status: "redirect",
        url: "https://pay.example/cs_2",
      });
      expect(
        dependencies.pricingEligibilityPort.tierForEmail,
      ).toHaveBeenCalledWith(call.visitorEmail);
      expect(
        dependencies.paymentCheckoutPort.createSession,
      ).toHaveBeenCalledWith({
        customerId: "cus_1",
        bundle: { id: "3-months", title: "3 Months", months: 3, amountCents },
        currency: "eur",
        metadata: {
          purpose: "coaching-subscription",
          assessmentCallId: call.id,
          bundleId: "3-months",
          tier,
          startChoice: "waiting",
        },
        successUrl: SUCCESS_URL,
        cancelUrl: CANCEL_URL,
      });
      expect(dependencies.checkoutSessionsPort.remember).toHaveBeenCalledWith({
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

function createSubscriptionIncidents() {
  return {
    subscriptionCancelled: vi.fn(),
    subscriptionCancellationFailed: vi.fn(),
    programStartedNow: vi.fn(),
    subscriptionEventReconciled: vi.fn(),
    refundSettled: vi.fn(),
    paymentMethodSessionOpened: vi.fn(),
    renewalHoldApplied: vi.fn(),
    renewalHoldFailed: vi.fn(),
    refundNotificationFailed: vi.fn(),
    paymentEventRejected: vi.fn(),
    paymentCardEventMirrored: vi.fn(),
    paymentCardRefreshFailed: vi.fn(),
    coachingEndNotPropagated: vi.fn(),
    coachingPeriodNotPropagated: vi.fn(),
    renewalHoldLiftFailed: vi.fn(),
  } satisfies CoachingSubscriptionIncidentsPort;
}

function createPaymentSubscriptions() {
  return {
    holdRenewal: vi.fn().mockResolvedValue(undefined),
    liftRenewalHold: vi.fn().mockResolvedValue(undefined),
    endNow: vi.fn(),
    endAt: vi.fn(),
    openPaymentMethodSession: vi.fn(),
  } satisfies PaymentSubscriptionsPort;
}

function checkoutPurchaseDependencies(
  answers: {
    ledger?: "recorded" | "duplicate";
    admitted?: PaidClientAdmissionOutcome;
  } = {},
) {
  return {
    paidClientAdmissionPort: createAdmission(
      answers.admitted ?? { status: "admitted", clientId: PAID_CLIENT_ID },
    ),
    endedCallsPort: createCalls(call),
    coachingSubscriptionIncidentsPort: createSubscriptionIncidents(),
    paymentCheckoutPort: createPaymentCheckout(completion),
    paymentEventLedgerPort: createPaymentEventLedger(
      answers.ledger ?? "recorded",
    ),
    paymentSubscriptionsPort: createPaymentSubscriptions(),
    coachingPurchasesPort: createPurchases(),
    coachingSubscriptionIdsPort: { generate: () => "subscription-1" },
    clockPort: clock,
  };
}

function recordedPurchase(
  status: RecordedCheckoutPurchase["status"],
  purchased: CheckoutCompletion = completion,
): RecordedCheckoutPurchase {
  return {
    status,
    clientId:
      status === "recorded" ? PAID_CLIENT_ID : CLIENT_RECORDED_EARLIER_ID,
    subscription: PurchasedSubscription.fromCompletedCheckout({
      id: "subscription-1",
      completion: purchased,
    }),
  };
}

const purchasedSubscription = PurchasedSubscription.fromCompletedCheckout({
  id: "subscription-1",
  completion,
});

const paidClientIntake: PaidClientIntake = {
  assessmentCallId: "call-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  bookingTimeZone: "Europe/Bucharest",
};

const checkoutPurchase: CheckoutPurchase = {
  eventId: "evt_1",
  receivedAt: NOW,
  client: paidClientIntake,
  subscription: purchasedSubscription,
};

describe("ReadCheckoutPurchaseUseCase", () => {
  it("drafts the purchase from the booking's client and the subscription the provider reports paid for the session under a fresh id, with no sales window consulted", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const readCheckoutPurchaseUseCase = new ReadCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const result = await readCheckoutPurchaseUseCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "found", purchase: checkoutPurchase });
    expect(
      dependencies.paymentCheckoutPort.findCompletedSession,
    ).toHaveBeenCalledWith("cs_2");
    expect(
      dependencies.coachingSubscriptionIncidentsPort.paymentEventRejected,
    ).not.toHaveBeenCalled();
  });

  it("rejects the event when the call does not exist", async () => {
    // arrange
    const dependencies = {
      ...checkoutPurchaseDependencies(),
      endedCallsPort: createCalls(null),
    };
    const readCheckoutPurchaseUseCase = new ReadCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const result = await readCheckoutPurchaseUseCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "call_not_found" });
    expect(dependencies.endedCallsPort.findById).toHaveBeenCalledWith(
      completion.assessmentCallId,
    );
    expect(
      dependencies.coachingSubscriptionIncidentsPort.paymentEventRejected,
    ).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
  });

  it("answers unreadable_checkout and reports it when the provider reports no paid coaching checkout for the session", async () => {
    // arrange
    const dependencies = {
      ...checkoutPurchaseDependencies(),
      paymentCheckoutPort: createPaymentCheckout(null),
    };
    const readCheckoutPurchaseUseCase = new ReadCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const result = await readCheckoutPurchaseUseCase.execute({
      eventId: "evt_3",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "unreadable_checkout" });
    expect(
      dependencies.coachingSubscriptionIncidentsPort.paymentEventRejected,
    ).toHaveBeenCalledWith({
      eventId: "evt_3",
      reason: "unreadable_checkout",
    });
    expect(dependencies.endedCallsPort.findById).not.toHaveBeenCalled();
  });

  it("propagates a failed read of the completion so the payment event is delivered again", async () => {
    // arrange
    const failure = new Error("provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    vi.mocked(
      dependencies.paymentCheckoutPort.findCompletedSession,
    ).mockRejectedValue(failure);
    const readCheckoutPurchaseUseCase = new ReadCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const reading = readCheckoutPurchaseUseCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    await expect(reading).rejects.toBe(failure);
    expect(dependencies.endedCallsPort.findById).not.toHaveBeenCalled();
  });
});

describe("RecordCheckoutPurchaseUseCase", () => {
  it("records the event in the ledger, admits the client with her standing, then records the subscription and spends its payment link", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const recordCheckoutPurchaseUseCase = new RecordCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const result =
      await recordCheckoutPurchaseUseCase.execute(checkoutPurchase);

    // assert
    expect(result).toEqual({
      status: "recorded",
      clientId: PAID_CLIENT_ID,
      subscription: purchasedSubscription,
    });
    expect(dependencies.paymentEventLedgerPort.record).toHaveBeenCalledWith({
      eventId: "evt_1",
      receivedAt: NOW,
    });
    expect(dependencies.paidClientAdmissionPort.admit).toHaveBeenCalledWith({
      client: paidClientIntake,
      standing: expect.anything(),
      at: NOW,
    });
    expect(
      dependencies.paidClientAdmissionPort.admit.mock.calls[0]?.[0].standing.toSnapshot(),
    ).toEqual({
      status: "not-started",
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: 3,
      programStartsAt: new Date("2026-10-10T10:05:00.000Z"),
      paidThrough: new Date("2026-12-26T10:05:00.000Z"),
    });
    expect(
      dependencies.coachingPurchasesPort.insertSubscription,
    ).toHaveBeenCalledWith({
      assessmentCallId: "call-1",
      clientId: PAID_CLIENT_ID,
      subscription: purchasedSubscription,
      receivedAt: NOW,
    });
    expect(
      dependencies.coachingPurchasesPort.spendPaymentLink,
    ).toHaveBeenCalledWith("cs_2");
    const stepOrder = [
      dependencies.paymentEventLedgerPort.record,
      dependencies.paidClientAdmissionPort.admit,
      dependencies.coachingPurchasesPort.insertSubscription,
      dependencies.coachingPurchasesPort.spendPaymentLink,
    ].map((step) => step.mock.invocationCallOrder[0] ?? 0);
    expect(stepOrder).toEqual(
      [...stepOrder].sort((first, second) => first - second),
    );
    expect(dependencies.paidClientAdmissionPort.invite).not.toHaveBeenCalled();
  });

  it("answers duplicate for a replayed event with the client recorded for the call, without raising an incident or writing anything else, never the unused fresh id", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies({ ledger: "duplicate" });
    const recordCheckoutPurchaseUseCase = new RecordCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const result =
      await recordCheckoutPurchaseUseCase.execute(checkoutPurchase);

    // assert
    expect(result).toEqual({
      status: "duplicate",
      clientId: CLIENT_RECORDED_EARLIER_ID,
      subscription: purchasedSubscription,
    });
    expect(
      dependencies.coachingPurchasesPort.findClientIdForCall,
    ).toHaveBeenCalledWith("call-1");
    expect(
      dependencies.coachingSubscriptionIncidentsPort.paymentEventRejected,
    ).not.toHaveBeenCalled();
    expect(dependencies.paidClientAdmissionPort.admit).not.toHaveBeenCalled();
    expect(
      dependencies.coachingPurchasesPort.insertSubscription,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.coachingPurchasesPort.spendPaymentLink,
    ).not.toHaveBeenCalled();
  });

  it("reports the unrecorded charge and throws CallAlreadyPaid so the unit of work rolls the event back, recording nothing more, when the call already has a client", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies({
      admitted: { status: "call_already_has_client" },
    });
    const recordCheckoutPurchaseUseCase = new RecordCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const recording = recordCheckoutPurchaseUseCase.execute({
      ...checkoutPurchase,
      eventId: "evt_2",
    });

    // assert
    await expect(recording).rejects.toBeInstanceOf(CallAlreadyPaid);
    expect(
      dependencies.coachingSubscriptionIncidentsPort.paymentEventRejected,
    ).toHaveBeenCalledWith({
      eventId: "evt_2",
      reason: "call_already_paid",
    });
    expect(
      dependencies.coachingPurchasesPort.insertSubscription,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.coachingPurchasesPort.spendPaymentLink,
    ).not.toHaveBeenCalled();
    expect(dependencies.paidClientAdmissionPort.invite).not.toHaveBeenCalled();
  });
});

describe("FinishCheckoutPurchaseUseCase", () => {
  it.each([
    ["a recorded", "recorded"],
    ["a replayed", "duplicate"],
  ] as const)(
    "holds the renewal of %s waiting payment until her program start, after inviting the client",
    async (_label, status) => {
      // arrange
      const dependencies = checkoutPurchaseDependencies();
      const finishCheckoutPurchaseUseCase = new FinishCheckoutPurchaseUseCase(
        dependencies,
      );

      // act
      await finishCheckoutPurchaseUseCase.execute(recordedPurchase(status));

      // assert
      expect(
        dependencies.paymentSubscriptionsPort.holdRenewal,
      ).toHaveBeenCalledWith({
        paymentSubscriptionId: "sub_1",
        until: new Date("2026-10-10T10:05:00.000Z"),
      });
      expect(
        dependencies.paidClientAdmissionPort.invite.mock.invocationCallOrder[0],
      ).toBeLessThan(
        dependencies.paymentSubscriptionsPort.holdRenewal.mock
          .invocationCallOrder[0] ?? 0,
      );
      expect(
        dependencies.coachingSubscriptionIncidentsPort.renewalHoldApplied,
      ).toHaveBeenCalledWith({
        paymentSubscriptionId: "sub_1",
      });
    },
  );

  it.each([
    ["recorded", PAID_CLIENT_ID],
    ["duplicate", CLIENT_RECORDED_EARLIER_ID],
  ] as const)(
    "invites the client the %s purchase names",
    async (status, clientId) => {
      // arrange
      const dependencies = checkoutPurchaseDependencies();
      const finishCheckoutPurchaseUseCase = new FinishCheckoutPurchaseUseCase(
        dependencies,
      );

      // act
      await finishCheckoutPurchaseUseCase.execute(recordedPurchase(status));

      // assert
      expect(dependencies.paidClientAdmissionPort.invite).toHaveBeenCalledWith({
        clientId,
      });
    },
  );

  it("holds no renewal when her program starts immediately", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const finishCheckoutPurchaseUseCase = new FinishCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    await finishCheckoutPurchaseUseCase.execute(
      recordedPurchase("recorded", { ...completion, startChoice: "immediate" }),
    );

    // assert
    expect(
      dependencies.paymentSubscriptionsPort.holdRenewal,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.coachingSubscriptionIncidentsPort.renewalHoldApplied,
    ).not.toHaveBeenCalled();
  });

  it("reports a failed hold and propagates it so the payment event is delivered again, with the client already invited", async () => {
    // arrange
    const failure = new Error("provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    dependencies.paymentSubscriptionsPort.holdRenewal.mockRejectedValue(
      failure,
    );
    const finishCheckoutPurchaseUseCase = new FinishCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const finishing = finishCheckoutPurchaseUseCase.execute(
      recordedPurchase("recorded"),
    );

    // assert
    await expect(finishing).rejects.toBe(failure);
    expect(dependencies.paidClientAdmissionPort.invite).toHaveBeenCalledWith({
      clientId: PAID_CLIENT_ID,
    });
    expect(
      dependencies.coachingSubscriptionIncidentsPort.renewalHoldFailed,
    ).toHaveBeenCalledWith({
      paymentSubscriptionId: "sub_1",
      error: failure,
    });
    expect(
      dependencies.coachingSubscriptionIncidentsPort.renewalHoldApplied,
    ).not.toHaveBeenCalled();
  });

  it("propagates an invitation failure without holding so the payment event is delivered again", async () => {
    // arrange
    const failure = new Error("identity provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    dependencies.paidClientAdmissionPort.invite.mockRejectedValue(failure);
    const finishCheckoutPurchaseUseCase = new FinishCheckoutPurchaseUseCase(
      dependencies,
    );

    // act
    const finishing = finishCheckoutPurchaseUseCase.execute(
      recordedPurchase("recorded"),
    );

    // assert
    await expect(finishing).rejects.toBe(failure);
    expect(
      dependencies.paymentSubscriptionsPort.holdRenewal,
    ).not.toHaveBeenCalled();
  });
});

describe("ReadCheckoutConfirmationUseCase", () => {
  it("answers closed without a lookup while sales are closed", async () => {
    // arrange
    const paymentCheckoutPort = createPaymentCheckout(completion);
    const readCheckoutConfirmationUseCase = new ReadCheckoutConfirmationUseCase(
      {
        paymentCheckoutPort,
        salesWindow: closedSalesWindow(),
      },
    );

    // act
    const result = await readCheckoutConfirmationUseCase.execute("cs_2");

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(paymentCheckoutPort.findCompletedSession).not.toHaveBeenCalled();
  });

  it("answers not_paid for a session that has not completed", async () => {
    // arrange
    const readCheckoutConfirmationUseCase = new ReadCheckoutConfirmationUseCase(
      {
        paymentCheckoutPort: createPaymentCheckout(null),
        salesWindow: openSalesWindow(),
      },
    );

    // act
    const result = await readCheckoutConfirmationUseCase.execute("cs_2");

    // assert
    expect(result).toEqual({ status: "not_paid" });
  });

  it("confirms the paid bundle with the program waiting 14 days after payment", async () => {
    // arrange
    const paymentCheckoutPort = createPaymentCheckout(completion);
    const readCheckoutConfirmationUseCase = new ReadCheckoutConfirmationUseCase(
      {
        paymentCheckoutPort,
        salesWindow: openSalesWindow(),
      },
    );

    // act
    const result = await readCheckoutConfirmationUseCase.execute("cs_2");

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
    expect(paymentCheckoutPort.findCompletedSession).toHaveBeenCalledWith(
      "cs_2",
    );
  });
});
