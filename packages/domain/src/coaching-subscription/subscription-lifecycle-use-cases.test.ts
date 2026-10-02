import { describe, expect, it, vi } from "vitest";

import type { ClientIdentities, ClientIdentity } from "../client";

import { CancelSubscriptionUseCase } from "./cancel-subscription-use-case";
import {
  CoachingSubscription,
  type CoachingSubscriptionSnapshot,
} from "./coaching-subscription";
import type { CoachingSubscriptionIncidents } from "./coaching-subscription-incidents";
import type { CoachingSubscriptions } from "./coaching-subscriptions";
import { OpenPaymentMethodSessionUseCase } from "./open-payment-method-session-use-case";
import type { PaymentSubscriptions } from "./payment-subscriptions";
import { ReadClientSubscriptionUseCase } from "./read-client-subscription-use-case";
import { ReconcileSubscriptionEventUseCase } from "./reconcile-subscription-event-use-case";
import { RefundDue } from "./refund-due";
import type { RefundNotifications } from "./refund-notifications";
import { StartProgramNowUseCase } from "./start-program-now-use-case";
import type { SubscriptionEvent } from "./subscription-event";

const AUTH_SUBJECT_ID = "user_ana";
const PAID_AT = new Date("2026-10-02T10:00:00.000Z");
const DAY_13 = new Date("2026-10-15T10:00:00.000Z");
const DAY_14 = new Date("2026-10-16T10:00:00.000Z");
const WITHDRAWAL_DEADLINE = new Date("2026-10-16T10:00:00.000Z");
const ACCESS_END = new Date("2027-01-02T10:00:00.000Z");
const RETURN_URL = "https://evoa.example/client/settings";

function snapshotOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscriptionSnapshot {
  return {
    id: "subscription-1",
    clientId: "client-1",
    bundleId: "3-months",
    months: 3,
    tier: "regular",
    amountCents: 44700,
    currency: "eur",
    paymentCustomerId: "cus_1",
    paymentSubscriptionId: "sub_1",
    checkoutSessionId: "cs_1",
    paidAt: PAID_AT,
    startChoice: "waiting",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    programStartedOn: null,
    paymentProblemSince: null,
    refund: null,
    ...overrides,
  };
}

function subscriptionOf(
  overrides: Partial<CoachingSubscriptionSnapshot> = {},
): CoachingSubscription {
  return CoachingSubscription.reconstitute(snapshotOf(overrides));
}

function clockAt(now: Date) {
  return { now: () => now };
}

function createSubscriptions(found: CoachingSubscription | null) {
  return {
    findCurrentForClient: vi.fn().mockResolvedValue(found),
    findCurrentForAuthSubject: vi.fn().mockResolvedValue(found),
    findByPaymentSubscriptionId: vi.fn().mockResolvedValue(found),
    findLatestByPaymentCustomerId: vi.fn().mockResolvedValue(found),
    save: vi.fn().mockResolvedValue("saved"),
    saveForEvent: vi.fn().mockResolvedValue("recorded"),
  } satisfies CoachingSubscriptions;
}

function createPaymentSubscriptions() {
  return {
    holdRenewal: vi.fn().mockResolvedValue(undefined),
    endNow: vi.fn().mockResolvedValue(undefined),
    endAt: vi.fn().mockResolvedValue(undefined),
    openPaymentMethodSession: vi
      .fn()
      .mockResolvedValue({ url: "https://billing.example/session" }),
  } satisfies PaymentSubscriptions;
}

function createIncidents() {
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
  } satisfies CoachingSubscriptionIncidents;
}

function createNotifications() {
  return {
    notifyRefundDue: vi.fn().mockResolvedValue("sent"),
  } satisfies RefundNotifications;
}

const ana: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  email: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  country: "RO",
  phone: null,
};

function createClients(found: ClientIdentity | null = ana) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies ClientIdentities;
}

function cancelUseCase(options: {
  now: Date;
  subscriptions: ReturnType<typeof createSubscriptions>;
  paymentSubscriptions?: ReturnType<typeof createPaymentSubscriptions>;
  incidents?: ReturnType<typeof createIncidents>;
  notifications?: ReturnType<typeof createNotifications>;
  clients?: ReturnType<typeof createClients>;
}) {
  return new CancelSubscriptionUseCase({
    clients: options.clients ?? createClients(),
    clock: clockAt(options.now),
    incidents: options.incidents ?? createIncidents(),
    notifications: options.notifications ?? createNotifications(),
    paymentSubscriptions:
      options.paymentSubscriptions ?? createPaymentSubscriptions(),
    subscriptions: options.subscriptions,
  });
}

describe("CancelSubscriptionUseCase", () => {
  it("ends a waiting-path subscription in the provider now, records the full refund due and tells the coach", async () => {
    // arrange
    const current = subscriptionOf();
    const subscriptions = createSubscriptions(current);
    const paymentSubscriptions = createPaymentSubscriptions();
    const notifications = createNotifications();
    const incidents = createIncidents();
    const useCase = cancelUseCase({
      now: DAY_13,
      subscriptions,
      paymentSubscriptions,
      notifications,
      incidents,
    });
    const refund = RefundDue.full({
      amountCents: 44700,
      cancelledAt: DAY_13,
    }).toSnapshot();
    const cancelled = snapshotOf({
      status: "ended",
      cancelledAt: DAY_13,
      accessEndsAt: DAY_13,
      refund,
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({
      status: "cancelled",
      rule: "full-refund",
      subscription: cancelled,
    });
    expect(subscriptions.findCurrentForAuthSubject).toHaveBeenCalledWith(
      AUTH_SUBJECT_ID,
    );
    expect(paymentSubscriptions.endNow).toHaveBeenCalledWith("sub_1");
    expect(subscriptions.save).toHaveBeenCalledWith({
      subscription: CoachingSubscription.reconstitute(cancelled),
      previous: current,
    });
    expect(notifications.notifyRefundDue).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      client: {
        clientId: "client-1",
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
      },
      paid: { amountCents: 44700, currency: "eur", at: PAID_AT },
      cancelledAt: DAY_13,
      refund,
    });
    expect(incidents.subscriptionCancelled).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      startChoice: "waiting",
      rule: "full-refund",
      refundDueCents: 44700,
    });
  });

  it("schedules the end in the provider at purchase plus the bundle months and owes nothing once the withdrawal right is gone", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    const paymentSubscriptions = createPaymentSubscriptions();
    const notifications = createNotifications();
    const incidents = createIncidents();
    const useCase = cancelUseCase({
      now: DAY_14,
      subscriptions,
      paymentSubscriptions,
      notifications,
      incidents,
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({
      status: "cancelled",
      rule: "no-refund",
      subscription: snapshotOf({
        status: "cancelled",
        cancelledAt: DAY_14,
        accessEndsAt: ACCESS_END,
      }),
    });
    expect(paymentSubscriptions.endAt).toHaveBeenCalledWith({
      paymentSubscriptionId: "sub_1",
      at: ACCESS_END,
    });
    expect(paymentSubscriptions.endNow).not.toHaveBeenCalled();
    expect(notifications.notifyRefundDue).not.toHaveBeenCalled();
    expect(incidents.subscriptionCancelled).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      startChoice: "waiting",
      rule: "no-refund",
      refundDueCents: 0,
    });
  });

  it("leaves the subscription unchanged and asks her to try again when the provider fails", async () => {
    // arrange
    const failure = new Error("provider down");
    const subscriptions = createSubscriptions(subscriptionOf());
    const paymentSubscriptions = createPaymentSubscriptions();
    paymentSubscriptions.endNow.mockRejectedValue(failure);
    const incidents = createIncidents();
    const useCase = cancelUseCase({
      now: DAY_13,
      subscriptions,
      paymentSubscriptions,
      incidents,
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "provider_unavailable" });
    expect(subscriptions.save).not.toHaveBeenCalled();
    expect(incidents.subscriptionCancellationFailed).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      rule: "full-refund",
      error: failure,
    });
  });

  it("has nothing to cancel once the subscription has ended", async () => {
    // arrange
    const subscriptions = createSubscriptions(
      subscriptionOf({
        status: "ended",
        cancelledAt: DAY_13,
        accessEndsAt: DAY_13,
      }),
    );
    const paymentSubscriptions = createPaymentSubscriptions();
    const useCase = cancelUseCase({
      now: DAY_14,
      subscriptions,
      paymentSubscriptions,
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "nothing_to_cancel" });
    expect(paymentSubscriptions.endNow).not.toHaveBeenCalled();
    expect(subscriptions.save).not.toHaveBeenCalled();
  });

  it("finds nothing to cancel for a subject with no subscription", async () => {
    // arrange
    const useCase = cancelUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(null),
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("re-reads and saves again once when a webhook changed the subscription meanwhile, without asking the provider twice", async () => {
    // arrange
    const flagged = subscriptionOf({ paymentProblemSince: DAY_13 });
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.findCurrentForAuthSubject
      .mockResolvedValueOnce(subscriptionOf())
      .mockResolvedValueOnce(flagged);
    subscriptions.save
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("saved");
    const paymentSubscriptions = createPaymentSubscriptions();
    const useCase = cancelUseCase({
      now: DAY_14,
      subscriptions,
      paymentSubscriptions,
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toMatchObject({
      status: "cancelled",
      subscription: { paymentProblemSince: DAY_13, status: "cancelled" },
    });
    expect(subscriptions.save).toHaveBeenLastCalledWith({
      subscription: CoachingSubscription.reconstitute(
        snapshotOf({
          paymentProblemSince: DAY_13,
          status: "cancelled",
          cancelledAt: DAY_14,
          accessEndsAt: ACCESS_END,
        }),
      ),
      previous: flagged,
    });
    expect(paymentSubscriptions.endAt).toHaveBeenCalledTimes(1);
  });

  it("fails the request when the subscription is still changing on the second save", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.save.mockResolvedValue("stale");
    const useCase = cancelUseCase({ now: DAY_14, subscriptions });

    // act
    const cancelling = useCase.execute(AUTH_SUBJECT_ID);

    // assert
    await expect(cancelling).rejects.toThrow();
    expect(subscriptions.save).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "the email is refused",
      () => createNotifications(),
      (notifications: ReturnType<typeof createNotifications>) =>
        notifications.notifyRefundDue.mockResolvedValue("failed"),
    ],
    [
      "the email throws",
      () => createNotifications(),
      (notifications: ReturnType<typeof createNotifications>) =>
        notifications.notifyRefundDue.mockRejectedValue(new Error("down")),
    ],
  ])(
    "keeps the cancellation and reports it when %s",
    async (_label, create, fail) => {
      // arrange
      const notifications = create();
      fail(notifications);
      const incidents = createIncidents();
      const useCase = cancelUseCase({
        now: DAY_13,
        subscriptions: createSubscriptions(subscriptionOf()),
        notifications,
        incidents,
      });

      // act
      const result = await useCase.execute(AUTH_SUBJECT_ID);

      // assert
      expect(result).toMatchObject({ status: "cancelled" });
      expect(incidents.refundNotificationFailed).toHaveBeenCalledWith({
        subscriptionId: "subscription-1",
      });
    },
  );

  it("reports the refund email as failed when the client cannot be read", async () => {
    // arrange
    const incidents = createIncidents();
    const notifications = createNotifications();
    const useCase = cancelUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(subscriptionOf()),
      clients: createClients(null),
      notifications,
      incidents,
    });

    // act
    await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(notifications.notifyRefundDue).not.toHaveBeenCalled();
    expect(incidents.refundNotificationFailed).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
    });
  });
});

describe("StartProgramNowUseCase", () => {
  function startNowUseCase(options: {
    now: Date;
    subscriptions: ReturnType<typeof createSubscriptions>;
    incidents?: ReturnType<typeof createIncidents>;
  }) {
    return new StartProgramNowUseCase({
      clock: clockAt(options.now),
      incidents: options.incidents ?? createIncidents(),
      subscriptions: options.subscriptions,
    });
  }

  it("turns her waiting path into an immediate start", async () => {
    // arrange
    const current = subscriptionOf();
    const subscriptions = createSubscriptions(current);
    const incidents = createIncidents();
    const useCase = startNowUseCase({ now: DAY_13, subscriptions, incidents });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "started" });
    expect(subscriptions.findCurrentForAuthSubject).toHaveBeenCalledWith(
      AUTH_SUBJECT_ID,
    );
    expect(subscriptions.save).toHaveBeenCalledWith({
      subscription: subscriptionOf({ startChoice: "immediate" }),
      previous: current,
    });
    expect(incidents.programStartedNow).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
    });
  });

  it.each([
    ["once the window has closed", subscriptionOf(), DAY_14, "outside-window"],
    [
      "once ended",
      subscriptionOf({ status: "ended", accessEndsAt: DAY_13 }),
      DAY_13,
      "ended",
    ],
  ] as const)("refuses %s", async (_label, current, now, reason) => {
    // arrange
    const subscriptions = createSubscriptions(current);
    const useCase = startNowUseCase({ now, subscriptions });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "refused", reason });
    expect(subscriptions.save).not.toHaveBeenCalled();
  });

  it("finds nothing to start for a subject with no subscription", async () => {
    // arrange
    const useCase = startNowUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(null),
    });

    // act
    const result = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("re-reads once when the subscription changed meanwhile, then fails on a second change", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.save.mockResolvedValue("stale");
    const useCase = startNowUseCase({ now: DAY_13, subscriptions });

    // act
    const starting = useCase.execute(AUTH_SUBJECT_ID);

    // assert
    await expect(starting).rejects.toThrow();
    expect(subscriptions.findCurrentForAuthSubject).toHaveBeenCalledTimes(2);
  });
});

describe("OpenPaymentMethodSessionUseCase", () => {
  function openUseCase(options: {
    now: Date;
    subscriptions: ReturnType<typeof createSubscriptions>;
    paymentSubscriptions?: ReturnType<typeof createPaymentSubscriptions>;
    incidents?: ReturnType<typeof createIncidents>;
  }) {
    return new OpenPaymentMethodSessionUseCase({
      clock: clockAt(options.now),
      incidents: options.incidents ?? createIncidents(),
      paymentSubscriptions:
        options.paymentSubscriptions ?? createPaymentSubscriptions(),
      subscriptions: options.subscriptions,
    });
  }

  it("opens a payment-method session for her own customer that returns to the given address", async () => {
    // arrange
    const paymentSubscriptions = createPaymentSubscriptions();
    const incidents = createIncidents();
    const useCase = openUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(subscriptionOf()),
      paymentSubscriptions,
      incidents,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: AUTH_SUBJECT_ID,
      returnUrl: RETURN_URL,
    });

    // assert
    expect(result).toEqual({
      status: "opened",
      url: "https://billing.example/session",
    });
    expect(paymentSubscriptions.openPaymentMethodSession).toHaveBeenCalledWith({
      paymentCustomerId: "cus_1",
      returnUrl: RETURN_URL,
    });
    expect(incidents.paymentMethodSessionOpened).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
    });
  });

  it("refuses once the subscription has ended", async () => {
    // arrange
    const paymentSubscriptions = createPaymentSubscriptions();
    const useCase = openUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(
        subscriptionOf({ status: "ended", accessEndsAt: DAY_13 }),
      ),
      paymentSubscriptions,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: AUTH_SUBJECT_ID,
      returnUrl: RETURN_URL,
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(
      paymentSubscriptions.openPaymentMethodSession,
    ).not.toHaveBeenCalled();
  });

  it("finds no session for a subject with no subscription", async () => {
    // arrange
    const useCase = openUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(null),
    });

    // act
    const result = await useCase.execute({
      authSubjectId: AUTH_SUBJECT_ID,
      returnUrl: RETURN_URL,
    });

    // assert
    expect(result).toEqual({ status: "not_found" });
  });

  it("answers provider_unavailable when the provider fails", async () => {
    // arrange
    const paymentSubscriptions = createPaymentSubscriptions();
    paymentSubscriptions.openPaymentMethodSession.mockRejectedValue(
      new Error("down"),
    );
    const useCase = openUseCase({
      now: DAY_13,
      subscriptions: createSubscriptions(subscriptionOf()),
      paymentSubscriptions,
    });

    // act
    const result = await useCase.execute({
      authSubjectId: AUTH_SUBJECT_ID,
      returnUrl: RETURN_URL,
    });

    // assert
    expect(result).toEqual({ status: "provider_unavailable" });
  });
});

describe("ReadClientSubscriptionUseCase", () => {
  it("reads her subscription with the rules that apply now", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    const useCase = new ReadClientSubscriptionUseCase({
      clock: clockAt(DAY_13),
      subscriptions,
    });

    // act
    const reading = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(reading).toEqual({
      subscription: snapshotOf(),
      status: "not-started",
      cancellationRule: "full-refund",
      withdrawalDeadline: WITHDRAWAL_DEADLINE,
      paidThrough: ACCESS_END,
      startNowUntil: WITHDRAWAL_DEADLINE,
      refundOutstanding: false,
    });
    expect(subscriptions.findCurrentForAuthSubject).toHaveBeenCalledWith(
      AUTH_SUBJECT_ID,
    );
  });

  it("reads an ended subscription with a refund still owed", async () => {
    // arrange
    const refund = RefundDue.full({ amountCents: 44700, cancelledAt: DAY_13 });
    const useCase = new ReadClientSubscriptionUseCase({
      clock: clockAt(DAY_14),
      subscriptions: createSubscriptions(
        subscriptionOf({
          status: "ended",
          cancelledAt: DAY_13,
          accessEndsAt: DAY_13,
          refund: refund.toSnapshot(),
        }),
      ),
    });

    // act
    const reading = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(reading).toMatchObject({
      status: "ended",
      cancellationRule: "none",
      startNowUntil: null,
      refundOutstanding: true,
    });
  });

  it("reads nothing for a subject with no subscription", async () => {
    // arrange
    const useCase = new ReadClientSubscriptionUseCase({
      clock: clockAt(DAY_13),
      subscriptions: createSubscriptions(null),
    });

    // act
    const reading = await useCase.execute(AUTH_SUBJECT_ID);

    // assert
    expect(reading).toBeNull();
  });
});

describe("ReconcileSubscriptionEventUseCase", () => {
  const OCCURRED_AT = new Date("2026-10-20T10:00:00.000Z");

  function reconcileUseCase(options: {
    subscriptions: ReturnType<typeof createSubscriptions>;
    incidents?: ReturnType<typeof createIncidents>;
  }) {
    return new ReconcileSubscriptionEventUseCase({
      incidents: options.incidents ?? createIncidents(),
      subscriptions: options.subscriptions,
    });
  }

  it.each<
    [string, CoachingSubscription, SubscriptionEvent, CoachingSubscription]
  >([
    [
      "a scheduled end",
      subscriptionOf(),
      {
        kind: "end-scheduled",
        paymentSubscriptionId: "sub_1",
        endsAt: ACCESS_END,
        occurredAt: OCCURRED_AT,
      },
      subscriptionOf({
        status: "cancelled",
        cancelledAt: OCCURRED_AT,
        accessEndsAt: ACCESS_END,
      }),
    ],
    [
      "a lifted end",
      subscriptionOf({
        status: "cancelled",
        cancelledAt: DAY_14,
        accessEndsAt: ACCESS_END,
      }),
      {
        kind: "end-lifted",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      },
      subscriptionOf(),
    ],
    [
      "an end",
      subscriptionOf(),
      { kind: "ended", paymentSubscriptionId: "sub_1", endedAt: OCCURRED_AT },
      subscriptionOf({
        status: "ended",
        cancelledAt: OCCURRED_AT,
        accessEndsAt: OCCURRED_AT,
      }),
    ],
    [
      "a payment problem",
      subscriptionOf(),
      {
        kind: "payment-problem",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      },
      subscriptionOf({ paymentProblemSince: OCCURRED_AT }),
    ],
    [
      "a recovered payment",
      subscriptionOf({ paymentProblemSince: DAY_13 }),
      {
        kind: "payment-recovered",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      },
      subscriptionOf(),
    ],
    [
      "a paid renewal",
      subscriptionOf({ paymentProblemSince: DAY_13 }),
      {
        kind: "renewal-paid",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      },
      subscriptionOf(),
    ],
  ])(
    "mirrors %s and records the event once with the change",
    async (_label, current, event, expected) => {
      // arrange
      const subscriptions = createSubscriptions(current);
      const incidents = createIncidents();
      const useCase = reconcileUseCase({ subscriptions, incidents });

      // act
      const result = await useCase.execute({ eventId: "evt_1", event });

      // assert
      expect(result).toEqual({ status: "recorded" });
      expect(subscriptions.findByPaymentSubscriptionId).toHaveBeenCalledWith(
        "sub_1",
      );
      expect(subscriptions.saveForEvent).toHaveBeenCalledWith({
        eventId: "evt_1",
        subscription: expected,
        previous: current,
      });
      expect(incidents.subscriptionEventReconciled).toHaveBeenCalledWith({
        eventId: "evt_1",
        eventKind: event.kind,
        paymentReference: "sub_1",
        outcome: "recorded",
      });
    },
  );

  it("settles the refund owed on the customer's latest subscription and reports it settled", async () => {
    // arrange
    const refund = RefundDue.full({ amountCents: 44700, cancelledAt: DAY_13 });
    const current = subscriptionOf({
      status: "ended",
      cancelledAt: DAY_13,
      accessEndsAt: DAY_13,
      refund: refund.toSnapshot(),
    });
    const subscriptions = createSubscriptions(current);
    const incidents = createIncidents();
    const useCase = reconcileUseCase({ subscriptions, incidents });

    // act
    const result = await useCase.execute({
      eventId: "evt_2",
      event: {
        kind: "charge-refunded",
        paymentCustomerId: "cus_1",
        refundedCents: 44700,
        occurredAt: OCCURRED_AT,
      },
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(subscriptions.findLatestByPaymentCustomerId).toHaveBeenCalledWith(
      "cus_1",
    );
    expect(subscriptions.saveForEvent).toHaveBeenCalledWith({
      eventId: "evt_2",
      subscription: current.settleRefund({
        refundedCents: 44700,
        at: OCCURRED_AT,
      }),
      previous: current,
    });
    expect(incidents.refundSettled).toHaveBeenCalledWith({
      subscriptionId: "subscription-1",
      refundedCents: 44700,
    });
  });

  it("does not report a partial refund as settled", async () => {
    // arrange
    const refund = RefundDue.full({ amountCents: 44700, cancelledAt: DAY_13 });
    const subscriptions = createSubscriptions(
      subscriptionOf({
        status: "ended",
        cancelledAt: DAY_13,
        accessEndsAt: DAY_13,
        refund: refund.toSnapshot(),
      }),
    );
    const incidents = createIncidents();
    const useCase = reconcileUseCase({ subscriptions, incidents });

    // act
    await useCase.execute({
      eventId: "evt_2",
      event: {
        kind: "charge-refunded",
        paymentCustomerId: "cus_1",
        refundedCents: 10000,
        occurredAt: OCCURRED_AT,
      },
    });

    // assert
    expect(incidents.refundSettled).not.toHaveBeenCalled();
  });

  it("acknowledges an event for an unknown subscription without saving and reports it", async () => {
    // arrange
    const subscriptions = createSubscriptions(null);
    const incidents = createIncidents();
    const useCase = reconcileUseCase({ subscriptions, incidents });

    // act
    const result = await useCase.execute({
      eventId: "evt_3",
      event: {
        kind: "ended",
        paymentSubscriptionId: "sub_unknown",
        endedAt: OCCURRED_AT,
      },
    });

    // assert
    expect(result).toEqual({ status: "ignored" });
    expect(subscriptions.saveForEvent).not.toHaveBeenCalled();
    expect(incidents.subscriptionEventReconciled).toHaveBeenCalledWith({
      eventId: "evt_3",
      eventKind: "ended",
      paymentReference: "sub_unknown",
      outcome: "unknown-subscription",
    });
  });

  it("answers duplicate for a redelivered event", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.saveForEvent.mockResolvedValue("duplicate");
    const incidents = createIncidents();
    const useCase = reconcileUseCase({ subscriptions, incidents });

    // act
    const result = await useCase.execute({
      eventId: "evt_1",
      event: {
        kind: "ended",
        paymentSubscriptionId: "sub_1",
        endedAt: OCCURRED_AT,
      },
    });

    // assert
    expect(result).toEqual({ status: "duplicate" });
    expect(incidents.subscriptionEventReconciled).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "duplicate" }),
    );
  });

  it("re-reads and re-decides once when a cancellation changed the subscription meanwhile", async () => {
    // arrange
    const cancelled = subscriptionOf({
      status: "cancelled",
      cancelledAt: DAY_14,
      accessEndsAt: ACCESS_END,
    });
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.findByPaymentSubscriptionId
      .mockResolvedValueOnce(subscriptionOf())
      .mockResolvedValueOnce(cancelled);
    subscriptions.saveForEvent
      .mockResolvedValueOnce("stale")
      .mockResolvedValueOnce("recorded");
    const useCase = reconcileUseCase({ subscriptions });

    // act
    const result = await useCase.execute({
      eventId: "evt_4",
      event: {
        kind: "payment-problem",
        paymentSubscriptionId: "sub_1",
        occurredAt: OCCURRED_AT,
      },
    });

    // assert
    expect(result).toEqual({ status: "recorded" });
    expect(subscriptions.saveForEvent).toHaveBeenLastCalledWith({
      eventId: "evt_4",
      subscription: cancelled.flagPaymentProblem(OCCURRED_AT),
      previous: cancelled,
    });
  });

  it("fails the delivery so the provider redelivers when the subscription keeps changing", async () => {
    // arrange
    const subscriptions = createSubscriptions(subscriptionOf());
    subscriptions.saveForEvent.mockResolvedValue("stale");
    const useCase = reconcileUseCase({ subscriptions });

    // act
    const reconciling = useCase.execute({
      eventId: "evt_5",
      event: {
        kind: "ended",
        paymentSubscriptionId: "sub_1",
        endedAt: OCCURRED_AT,
      },
    });

    // assert
    await expect(reconciling).rejects.toThrow();
    expect(subscriptions.saveForEvent).toHaveBeenCalledTimes(2);
  });
});
