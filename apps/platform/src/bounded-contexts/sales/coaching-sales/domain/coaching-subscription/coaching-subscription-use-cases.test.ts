import { describe, expect, it, vi } from "vitest";

import type { EndedCalls, SalesCall } from "../payment-link";
import type { PriceTier, PricingEligibility } from "../coaching-bundle";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";
import {
  CoachingSalesWindow,
  PaymentLink,
  type CallSalesStates,
  type CoachingSalesIncidents,
  type PaymentLinks,
  type PaymentLinkState,
  type PaymentLinkTokenHasher,
} from "../payment-link";

import {
  CallAlreadyPaid,
  type CheckoutPurchase,
  type RecordedCheckoutPurchase,
} from "./checkout-purchase";
import type { CheckoutSessions } from "./checkout-sessions";
import type { CoachingPurchases } from "./coaching-purchases";
import type { CheckoutCompletion } from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type {
  PaidClientAdmission,
  PaidClientAdmissionOutcome,
  PaidClientIntake,
} from "./paid-client-admission";
import type { PaymentCheckout } from "./payment-checkout";
import type { PaymentEventLedger } from "./payment-event-ledger";
import type { PaymentSubscriptions } from "./payment-subscriptions";
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

function createIncidents(): CoachingSalesIncidents {
  return {
    salesModeReadFailed: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
  };
}

function openSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    incidents: createIncidents(),
    waitlistMode: { isEnabled: vi.fn().mockResolvedValue(false) },
  });
}

function closedSalesWindow(): CoachingSalesWindow {
  return new CoachingSalesWindow({
    incidents: createIncidents(),
    waitlistMode: { isEnabled: vi.fn().mockResolvedValue(true) },
  });
}

function createCalls(found: SalesCall | null): EndedCalls {
  return { findById: vi.fn().mockResolvedValue(found) };
}

function createCallSalesStates(
  states: Awaited<ReturnType<CallSalesStates["forCalls"]>>,
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
  return {
    tierForEmail: vi.fn().mockResolvedValue(tier),
    tiersForEmails: vi.fn(),
  };
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

const PAID_CLIENT_ID = "client-1";

const CLIENT_RECORDED_EARLIER_ID = "client-recorded-earlier";

function createPurchases() {
  return {
    insertSubscription: vi.fn().mockResolvedValue(undefined),
    spendPaymentLink: vi.fn().mockResolvedValue(undefined),
    findClientIdForCall: vi.fn().mockResolvedValue(CLIENT_RECORDED_EARLIER_ID),
  } satisfies CoachingPurchases;
}

function createAdmission(admitted: PaidClientAdmissionOutcome) {
  return {
    admit: vi.fn().mockResolvedValue(admitted),
    invite: vi.fn().mockResolvedValue(undefined),
  } satisfies PaidClientAdmission;
}

function createPaymentEventLedger(outcome: "recorded" | "duplicate") {
  return {
    record: vi.fn().mockResolvedValue(outcome),
  } satisfies PaymentEventLedger;
}

function startCheckoutDependencies(
  overrides?: Partial<ConstructorParameters<typeof StartCheckoutUseCase>[0]>,
) {
  return {
    calls: createCalls(call),
    callSalesStates: createCallSalesStates(
      new Map([[call.id, { state: "payment-link-sent", clientId: null }]]),
    ),
    checkoutSessions: createCheckoutSessions([]),
    clock,
    emailAcceptance: createEmailAcceptance("allowed"),
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
      callSalesStates: createCallSalesStates(
        new Map([[call.id, { state: "paid", clientId: "client-1" }]]),
      ),
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
        call.visitorEmail,
      );
      expect(dependencies.paymentCheckout.createSession).toHaveBeenCalledWith({
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
  } satisfies CoachingSubscriptionIncidents;
}

function createPaymentSubscriptions() {
  return {
    holdRenewal: vi.fn().mockResolvedValue(undefined),
    liftRenewalHold: vi.fn().mockResolvedValue(undefined),
    endNow: vi.fn(),
    endAt: vi.fn(),
    openPaymentMethodSession: vi.fn(),
  } satisfies PaymentSubscriptions;
}

function checkoutPurchaseDependencies(
  answers: {
    ledger?: "recorded" | "duplicate";
    admitted?: PaidClientAdmissionOutcome;
  } = {},
) {
  return {
    admission: createAdmission(
      answers.admitted ?? { status: "admitted", clientId: PAID_CLIENT_ID },
    ),
    calls: createCalls(call),
    incidents: createSubscriptionIncidents(),
    paymentCheckout: createPaymentCheckout(completion),
    paymentEventLedger: createPaymentEventLedger(answers.ledger ?? "recorded"),
    paymentSubscriptions: createPaymentSubscriptions(),
    purchases: createPurchases(),
    subscriptionIds: { generate: () => "subscription-1" },
    clock,
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
    paymentCustomerId: "cus_1",
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
  paymentCustomerId: "cus_1",
};

describe("ReadCheckoutPurchaseUseCase", () => {
  it("drafts the purchase from the booking's client and the subscription the provider reports paid for the session under a fresh id, with no sales window consulted", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const useCase = new ReadCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "found", purchase: checkoutPurchase });
    expect(
      dependencies.paymentCheckout.findCompletedSession,
    ).toHaveBeenCalledWith("cs_2");
    expect(dependencies.incidents.paymentEventRejected).not.toHaveBeenCalled();
  });

  it("rejects the event when the call does not exist", async () => {
    // arrange
    const dependencies = {
      ...checkoutPurchaseDependencies(),
      calls: createCalls(null),
    };
    const useCase = new ReadCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "call_not_found" });
    expect(dependencies.calls.findById).toHaveBeenCalledWith(
      completion.assessmentCallId,
    );
    expect(dependencies.incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_1",
      reason: "call_not_found",
    });
  });

  it("answers unreadable_checkout and reports it when the provider reports no paid coaching checkout for the session", async () => {
    // arrange
    const dependencies = {
      ...checkoutPurchaseDependencies(),
      paymentCheckout: createPaymentCheckout(null),
    };
    const useCase = new ReadCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute({
      eventId: "evt_3",
      checkoutSessionId: "cs_2",
    });

    // assert
    expect(result).toEqual({ status: "unreadable_checkout" });
    expect(dependencies.incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_3",
      reason: "unreadable_checkout",
    });
    expect(dependencies.calls.findById).not.toHaveBeenCalled();
  });

  it("propagates a failed read of the completion so the payment event is delivered again", async () => {
    // arrange
    const failure = new Error("provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    vi.mocked(
      dependencies.paymentCheckout.findCompletedSession,
    ).mockRejectedValue(failure);
    const useCase = new ReadCheckoutPurchaseUseCase(dependencies);

    // act
    const reading = useCase.execute({
      eventId: "evt_1",
      checkoutSessionId: "cs_2",
    });

    // assert
    await expect(reading).rejects.toBe(failure);
    expect(dependencies.calls.findById).not.toHaveBeenCalled();
  });
});

describe("RecordCheckoutPurchaseUseCase", () => {
  it("records the event in the ledger, admits the client with her standing, then records the subscription and spends its payment link", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const useCase = new RecordCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute(checkoutPurchase);

    // assert
    expect(result).toEqual({
      status: "recorded",
      clientId: PAID_CLIENT_ID,
      subscription: purchasedSubscription,
      paymentCustomerId: "cus_1",
    });
    expect(dependencies.paymentEventLedger.record).toHaveBeenCalledWith({
      eventId: "evt_1",
      receivedAt: NOW,
    });
    expect(dependencies.admission.admit).toHaveBeenCalledWith({
      client: paidClientIntake,
      standing: expect.anything(),
      at: NOW,
    });
    expect(
      dependencies.admission.admit.mock.calls[0]?.[0].standing.toSnapshot(),
    ).toEqual({
      status: "not-started",
      accessEndsAt: null,
      refundDue: false,
      bundleMonths: 3,
      programStartsAt: new Date("2026-10-10T10:05:00.000Z"),
      paidThrough: new Date("2026-12-26T10:05:00.000Z"),
    });
    expect(dependencies.purchases.insertSubscription).toHaveBeenCalledWith({
      assessmentCallId: "call-1",
      clientId: PAID_CLIENT_ID,
      subscription: purchasedSubscription,
      receivedAt: NOW,
    });
    expect(dependencies.purchases.spendPaymentLink).toHaveBeenCalledWith(
      "cs_2",
    );
    const stepOrder = [
      dependencies.paymentEventLedger.record,
      dependencies.admission.admit,
      dependencies.purchases.insertSubscription,
      dependencies.purchases.spendPaymentLink,
    ].map((step) => step.mock.invocationCallOrder[0] ?? 0);
    expect(stepOrder).toEqual(
      [...stepOrder].sort((first, second) => first - second),
    );
    expect(dependencies.admission.invite).not.toHaveBeenCalled();
  });

  it("answers duplicate for a replayed event with the client recorded for the call, without raising an incident or writing anything else, never the unused fresh id", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies({ ledger: "duplicate" });
    const useCase = new RecordCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute(checkoutPurchase);

    // assert
    expect(result).toEqual({
      status: "duplicate",
      clientId: CLIENT_RECORDED_EARLIER_ID,
      subscription: purchasedSubscription,
      paymentCustomerId: "cus_1",
    });
    expect(dependencies.purchases.findClientIdForCall).toHaveBeenCalledWith(
      "call-1",
    );
    expect(dependencies.incidents.paymentEventRejected).not.toHaveBeenCalled();
    expect(dependencies.admission.admit).not.toHaveBeenCalled();
    expect(dependencies.purchases.insertSubscription).not.toHaveBeenCalled();
    expect(dependencies.purchases.spendPaymentLink).not.toHaveBeenCalled();
  });

  it("reports the unrecorded charge and throws CallAlreadyPaid so the unit of work rolls the event back, recording nothing more, when the call already has a client", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies({
      admitted: { status: "call_already_has_client" },
    });
    const useCase = new RecordCheckoutPurchaseUseCase(dependencies);

    // act
    const recording = useCase.execute({
      ...checkoutPurchase,
      eventId: "evt_2",
    });

    // assert
    await expect(recording).rejects.toBeInstanceOf(CallAlreadyPaid);
    expect(dependencies.incidents.paymentEventRejected).toHaveBeenCalledWith({
      eventId: "evt_2",
      reason: "call_already_paid",
    });
    expect(dependencies.purchases.insertSubscription).not.toHaveBeenCalled();
    expect(dependencies.purchases.spendPaymentLink).not.toHaveBeenCalled();
    expect(dependencies.admission.invite).not.toHaveBeenCalled();
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
      const useCase = new FinishCheckoutPurchaseUseCase(dependencies);

      // act
      await useCase.execute(recordedPurchase(status));

      // assert
      expect(
        dependencies.paymentSubscriptions.holdRenewal,
      ).toHaveBeenCalledWith({
        paymentSubscriptionId: "sub_1",
        until: new Date("2026-10-10T10:05:00.000Z"),
      });
      expect(
        dependencies.admission.invite.mock.invocationCallOrder[0],
      ).toBeLessThan(
        dependencies.paymentSubscriptions.holdRenewal.mock
          .invocationCallOrder[0] ?? 0,
      );
      expect(dependencies.incidents.renewalHoldApplied).toHaveBeenCalledWith({
        paymentSubscriptionId: "sub_1",
      });
    },
  );

  it.each([
    ["recorded", PAID_CLIENT_ID],
    ["duplicate", CLIENT_RECORDED_EARLIER_ID],
  ] as const)(
    "invites the client the %s purchase names and answers its status with her payment customer",
    async (status, clientId) => {
      // arrange
      const dependencies = checkoutPurchaseDependencies();
      const useCase = new FinishCheckoutPurchaseUseCase(dependencies);

      // act
      const result = await useCase.execute(recordedPurchase(status));

      // assert
      expect(result).toEqual({ status, paymentCustomerId: "cus_1" });
      expect(dependencies.admission.invite).toHaveBeenCalledWith({ clientId });
    },
  );

  it("holds no renewal when her program starts immediately", async () => {
    // arrange
    const dependencies = checkoutPurchaseDependencies();
    const useCase = new FinishCheckoutPurchaseUseCase(dependencies);

    // act
    const result = await useCase.execute(
      recordedPurchase("recorded", { ...completion, startChoice: "immediate" }),
    );

    // assert
    expect(result).toEqual({ status: "recorded", paymentCustomerId: "cus_1" });
    expect(
      dependencies.paymentSubscriptions.holdRenewal,
    ).not.toHaveBeenCalled();
    expect(dependencies.incidents.renewalHoldApplied).not.toHaveBeenCalled();
  });

  it("reports a failed hold and propagates it so the payment event is delivered again, with the client already invited", async () => {
    // arrange
    const failure = new Error("provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    dependencies.paymentSubscriptions.holdRenewal.mockRejectedValue(failure);
    const useCase = new FinishCheckoutPurchaseUseCase(dependencies);

    // act
    const finishing = useCase.execute(recordedPurchase("recorded"));

    // assert
    await expect(finishing).rejects.toBe(failure);
    expect(dependencies.admission.invite).toHaveBeenCalledWith({
      clientId: PAID_CLIENT_ID,
    });
    expect(dependencies.incidents.renewalHoldFailed).toHaveBeenCalledWith({
      paymentSubscriptionId: "sub_1",
      error: failure,
    });
    expect(dependencies.incidents.renewalHoldApplied).not.toHaveBeenCalled();
  });

  it("propagates an invitation failure without holding so the payment event is delivered again", async () => {
    // arrange
    const failure = new Error("identity provider unavailable");
    const dependencies = checkoutPurchaseDependencies();
    dependencies.admission.invite.mockRejectedValue(failure);
    const useCase = new FinishCheckoutPurchaseUseCase(dependencies);

    // act
    const finishing = useCase.execute(recordedPurchase("recorded"));

    // assert
    await expect(finishing).rejects.toBe(failure);
    expect(
      dependencies.paymentSubscriptions.holdRenewal,
    ).not.toHaveBeenCalled();
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
