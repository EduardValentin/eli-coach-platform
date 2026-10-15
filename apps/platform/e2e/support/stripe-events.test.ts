import { describe, expect, it } from "vitest";

import {
  selectRecordedEvent,
  simulatedRenewalFailureEvents,
  simulatedRenewalPaidEvent,
  type RecordedStripeEvent,
} from "./stripe-events";

const SUBSCRIPTION_ID = "sub_e2e_held";
const OTHER_SUBSCRIPTION_ID = "sub_e2e_other";
const HOLD_REQUEST_ID = "req_e2e_hold";
const CANCEL_REQUEST_ID = "req_e2e_cancel";
const PERIOD_END = new Date("2027-04-21T08:00:00.000Z");

function recordedEvent(
  id: string,
  objectId: string,
  requestId: string | null,
): RecordedStripeEvent {
  return {
    id,
    type: "customer.subscription.updated",
    request: { id: requestId },
    data: { object: { id: objectId } },
  };
}

describe("selectRecordedEvent", () => {
  it("picks the event Stripe recorded for the object", () => {
    // arrange
    const events = [
      recordedEvent("evt_other", OTHER_SUBSCRIPTION_ID, null),
      recordedEvent("evt_held", SUBSCRIPTION_ID, HOLD_REQUEST_ID),
    ];

    // act
    const selected = selectRecordedEvent(events, {
      type: "customer.subscription.updated",
      objectId: SUBSCRIPTION_ID,
    });

    // assert
    expect(selected?.id).toBe("evt_held");
  });

  it("finds nothing while Stripe has not recorded the event yet", () => {
    // arrange
    const events = [recordedEvent("evt_other", OTHER_SUBSCRIPTION_ID, null)];

    // act
    const selected = selectRecordedEvent(events, {
      type: "customer.subscription.updated",
      objectId: SUBSCRIPTION_ID,
    });

    // assert
    expect(selected).toBeNull();
  });

  it("ignores events of another type for the same object", () => {
    // arrange
    const events = [
      {
        ...recordedEvent("evt_deleted", SUBSCRIPTION_ID, null),
        type: "customer.subscription.deleted",
      },
    ];

    // act
    const selected = selectRecordedEvent(events, {
      type: "customer.subscription.updated",
      objectId: SUBSCRIPTION_ID,
    });

    // assert
    expect(selected).toBeNull();
  });

  it("narrows to the event the named request caused", () => {
    // arrange
    const events = [
      recordedEvent("evt_cancel", SUBSCRIPTION_ID, CANCEL_REQUEST_ID),
      recordedEvent("evt_hold", SUBSCRIPTION_ID, HOLD_REQUEST_ID),
    ];

    // act
    const selected = selectRecordedEvent(events, {
      type: "customer.subscription.updated",
      objectId: SUBSCRIPTION_ID,
      causedBy: CANCEL_REQUEST_ID,
    });

    // assert
    expect(selected?.id).toBe("evt_cancel");
  });

  it("refuses to guess between several events for the same object", () => {
    // arrange
    const events = [
      recordedEvent("evt_cancel", SUBSCRIPTION_ID, CANCEL_REQUEST_ID),
      recordedEvent("evt_hold", SUBSCRIPTION_ID, HOLD_REQUEST_ID),
    ];

    // act
    const selecting = () =>
      selectRecordedEvent(events, {
        type: "customer.subscription.updated",
        objectId: SUBSCRIPTION_ID,
      });

    // assert
    expect(selecting).toThrow(/2 customer.subscription.updated events/);
  });
});

describe("simulatedRenewalFailureEvents", () => {
  const renewal = {
    subscription: {
      id: SUBSCRIPTION_ID,
      customer: "cus_e2e_held",
      currency: "eur",
      metadata: { purpose: "coaching-subscription" },
    },
    reference: "failure",
    periodEnd: PERIOD_END,
  };

  it("reports the failed renewal invoice under the subscription it renews", () => {
    // act
    const [invoiceFailed] = simulatedRenewalFailureEvents(renewal);

    // assert
    expect(invoiceFailed).toEqual({
      id: "evt_e2e_failure_payment_failed",
      type: "invoice.payment_failed",
      data: {
        object: expect.objectContaining({
          customer: "cus_e2e_held",
          billing_reason: "subscription_cycle",
          lines: { data: [{ period: { end: 1808294400 } }] },
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription: SUBSCRIPTION_ID,
              metadata: { purpose: "coaching-subscription" },
            },
          },
        }),
      },
    });
  });

  it("moves the subscription from active to past due", () => {
    // act
    const [, pastDue] = simulatedRenewalFailureEvents(renewal);

    // assert
    expect(pastDue).toEqual({
      id: "evt_e2e_failure_past_due",
      type: "customer.subscription.updated",
      data: {
        object: { ...renewal.subscription, status: "past_due" },
        previous_attributes: { status: "active" },
      },
    });
  });
});

describe("simulatedRenewalPaidEvent", () => {
  it("reports the paid renewal invoice with the end of the period it pays for", () => {
    // arrange
    const renewal = {
      subscription: {
        id: SUBSCRIPTION_ID,
        customer: "cus_e2e_held",
        currency: "eur",
        metadata: { purpose: "coaching-subscription" },
      },
      reference: "renewal",
      periodEnd: PERIOD_END,
    };

    // act
    const invoicePaid = simulatedRenewalPaidEvent(renewal);

    // assert
    expect(invoicePaid).toEqual({
      id: "evt_e2e_renewal_paid",
      type: "invoice.paid",
      data: {
        object: expect.objectContaining({
          customer: "cus_e2e_held",
          billing_reason: "subscription_cycle",
          status: "paid",
          lines: { data: [{ period: { end: 1808294400 } }] },
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription: SUBSCRIPTION_ID,
              metadata: { purpose: "coaching-subscription" },
            },
          },
        }),
      },
    });
  });
});
