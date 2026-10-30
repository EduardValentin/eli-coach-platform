import { describe, expect, it, vi } from "vitest";

import type { EndedCallsPort, SalesCall } from "./ended-calls-port";
import type { PricingEligibilityPort } from "../coaching-bundle";
import { createEmailAcceptance } from "~/shared/submission-checks/email-address";

import type {
  CallSalesState,
  CallSalesStatesPort,
} from "./call-sales-states-port";
import type { CoachingSalesIncidentsPort } from "./coaching-sales-incidents-port";
import type { CoachingSalesNotificationsPort } from "./coaching-sales-notifications-port";
import type { WaitlistModePort } from "./waitlist-mode-port";
import { CoachingSalesWindow } from "./coaching-sales-window";
import { OpenBundlePageUseCase } from "./open-bundle-page-use-case";
import { PaymentLink, type PaymentLinkState } from "./payment-link";
import type { PaymentLinksPort } from "./payment-links-port";
import type { PaymentLinkTokenHasherPort } from "./payment-link-token-hasher-port";
import type { PaymentLinkTokenGeneratorPort } from "./payment-link-token-generator-port";
import { ReadCallSalesStatesUseCase } from "./read-call-sales-states-use-case";
import { ResolvePaymentLinkUseCase } from "./resolve-payment-link-use-case";
import { SendPaymentLinkUseCase } from "./send-payment-link-use-case";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const RAW_TOKEN = "raw-payment-link-token";
const TOKEN_SHA256 = "b".repeat(64);
const NEW_LINK_ID = "link-2";

const call: SalesCall = {
  id: "call-1",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: null,
  visitorTimeZone: "Europe/Bucharest",
  endsAt: new Date("2026-09-25T15:30:00.000Z"),
};

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

function createIncidents(): CoachingSalesIncidentsPort {
  return {
    salesModeReadFailed: vi.fn(),
    paymentLinkEmailFailed: vi.fn(),
  };
}

function salesWindowReading(waitlistModePort: WaitlistModePort) {
  return new CoachingSalesWindow({
    coachingSalesIncidentsPort: createIncidents(),
    waitlistModePort,
  });
}

function openSalesWindow(): CoachingSalesWindow {
  return salesWindowReading({ isEnabled: vi.fn().mockResolvedValue(false) });
}

function closedSalesWindow(): CoachingSalesWindow {
  return salesWindowReading({ isEnabled: vi.fn().mockResolvedValue(true) });
}

function createCalls(found: SalesCall | null): EndedCallsPort {
  return { findById: vi.fn().mockResolvedValue(found) };
}

function createCallSalesStates(
  states: Awaited<ReturnType<CallSalesStatesPort["forCalls"]>>,
): CallSalesStatesPort {
  return { forCalls: vi.fn().mockResolvedValue(states) };
}

function createPaymentLinks(found: PaymentLink | null): PaymentLinksPort {
  return {
    findByTokenSha256: vi.fn().mockResolvedValue(found),
    issue: vi.fn().mockResolvedValue(undefined),
    voidOtherLinksOf: vi.fn().mockResolvedValue(undefined),
    void: vi.fn().mockResolvedValue(undefined),
    findPaymentCustomerForCall: vi.fn().mockResolvedValue(null),
    rememberPaymentCustomer: vi.fn().mockResolvedValue(undefined),
  };
}

function createPricingEligibility(
  tier: Awaited<ReturnType<PricingEligibilityPort["tierForEmail"]>>,
): PricingEligibilityPort {
  return {
    tierForEmail: vi.fn().mockResolvedValue(tier),
    tiersForEmails: vi.fn(),
  };
}

function createNotifications(
  delivery: "sent" | "failed",
): CoachingSalesNotificationsPort {
  return { sendPaymentLink: vi.fn().mockResolvedValue(delivery) };
}

function createTokenGenerator(): PaymentLinkTokenGeneratorPort {
  return {
    create: vi
      .fn()
      .mockReturnValue({ rawToken: RAW_TOKEN, sha256: TOKEN_SHA256 }),
  };
}

function createTokenHasher(): PaymentLinkTokenHasherPort {
  return { sha256: vi.fn().mockReturnValue(TOKEN_SHA256) };
}

function sendPaymentLinkDependencies(
  overrides?: Partial<ConstructorParameters<typeof SendPaymentLinkUseCase>[0]>,
) {
  return {
    endedCallsPort: createCalls(call),
    callSalesStatesPort: createCallSalesStates(new Map()),
    clockPort: clockAt(NOW),
    emailAcceptancePort: createEmailAcceptance("allowed"),
    coachingSalesIncidentsPort: createIncidents(),
    coachingSalesNotificationsPort: createNotifications("sent"),
    paymentLinksPort: createPaymentLinks(null),
    pricingEligibilityPort: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    paymentLinkTokenGeneratorPort: createTokenGenerator(),
    paymentLinkIdsPort: { generate: () => NEW_LINK_ID },
    ...overrides,
  };
}

function resolvePaymentLinkDependencies(
  overrides?: Partial<
    ConstructorParameters<typeof ResolvePaymentLinkUseCase>[0]
  >,
) {
  return {
    endedCallsPort: createCalls(call),
    callSalesStatesPort: createCallSalesStates(
      new Map([[call.id, { state: "payment-link-sent", clientId: null }]]),
    ),
    clockPort: clockAt(NOW),
    emailAcceptancePort: createEmailAcceptance("allowed"),
    paymentLinksPort: createPaymentLinks(usableLink),
    pricingEligibilityPort: createPricingEligibility("regular"),
    salesWindow: openSalesWindow(),
    paymentLinkTokenHasherPort: createTokenHasher(),
    ...overrides,
  };
}

describe("CoachingSalesWindow", () => {
  it.each([
    ["open once waitlist mode is off", false, true],
    ["closed while the site is in waitlist mode", true, false],
  ])("is %s", async (_label, waitlistModeEnabled, expected) => {
    // arrange
    const salesWindow = salesWindowReading({
      isEnabled: vi.fn().mockResolvedValue(waitlistModeEnabled),
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
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: call.id,
    });

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(dependencies.endedCallsPort.findById).not.toHaveBeenCalled();
    expect(dependencies.callSalesStatesPort.forCalls).not.toHaveBeenCalled();
    expect(
      dependencies.paymentLinkTokenGeneratorPort.create,
    ).not.toHaveBeenCalled();
    expect(dependencies.paymentLinksPort.issue).not.toHaveBeenCalled();
    expect(
      dependencies.coachingSalesNotificationsPort.sendPaymentLink,
    ).not.toHaveBeenCalled();
  });

  it("answers closed and records the incident when the sales mode cannot be read", async () => {
    // arrange
    const failure = new Error("flags unavailable");
    const coachingSalesIncidentsPort = createIncidents();
    const dependencies = sendPaymentLinkDependencies({
      salesWindow: new CoachingSalesWindow({
        coachingSalesIncidentsPort,
        waitlistModePort: { isEnabled: vi.fn().mockRejectedValue(failure) },
      }),
    });
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: call.id,
    });

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(coachingSalesIncidentsPort.salesModeReadFailed).toHaveBeenCalledWith(
      failure,
    );
    expect(dependencies.endedCallsPort.findById).not.toHaveBeenCalled();
  });

  it("answers call_not_found for an unknown call", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      endedCallsPort: createCalls(null),
    });
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: "call-404",
    });

    // assert
    expect(result).toEqual({ status: "call_not_found" });
    expect(dependencies.endedCallsPort.findById).toHaveBeenCalledWith(
      "call-404",
    );
    expect(dependencies.paymentLinksPort.issue).not.toHaveBeenCalled();
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
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(
      sendPaymentLinkDependencies({ clockPort: clockAt(now) }),
    );

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: call.id,
    });

    // assert
    expect(result).toEqual(expected);
  });

  it("answers already_paid without issuing a link for a paid call", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      callSalesStatesPort: createCallSalesStates(
        new Map([[call.id, { state: "paid", clientId: "client-1" }]]),
      ),
    });
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: call.id,
    });

    // assert
    expect(result).toEqual({ status: "already_paid" });
    expect(dependencies.callSalesStatesPort.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(
      dependencies.paymentLinkTokenGeneratorPort.create,
    ).not.toHaveBeenCalled();
    expect(dependencies.paymentLinksPort.issue).not.toHaveBeenCalled();
    expect(
      dependencies.coachingSalesNotificationsPort.sendPaymentLink,
    ).not.toHaveBeenCalled();
  });

  it("sends a 30-day link priced at the visitor's tier to the booking email", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies({
      callSalesStatesPort: createCallSalesStates(
        new Map([[call.id, { state: "payment-link-sent", clientId: null }]]),
      ),
      pricingEligibilityPort: createPricingEligibility("reduced"),
    });
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    const result = await sendPaymentLinkUseCase.execute({
      assessmentCallId: call.id,
    });

    // assert
    expect(result).toEqual({ status: "sent", email: "ana@example.com" });
    expect(
      dependencies.pricingEligibilityPort.tierForEmail,
    ).toHaveBeenCalledWith(call.visitorEmail);
    expect(dependencies.paymentLinksPort.issue).toHaveBeenCalledWith(
      PaymentLink.issued({
        id: NEW_LINK_ID,
        assessmentCallId: call.id,
        tokenSha256: TOKEN_SHA256,
        at: NOW,
      }),
    );
    expect(
      dependencies.coachingSalesNotificationsPort.sendPaymentLink,
    ).toHaveBeenCalledWith({
      call,
      paymentLinkId: NEW_LINK_ID,
      rawToken: RAW_TOKEN,
      tier: "reduced",
    });
    expect(dependencies.paymentLinksPort.void).not.toHaveBeenCalled();
  });

  it("voids the call's earlier links, keeping the new one, only after the email is sent", async () => {
    // arrange
    const dependencies = sendPaymentLinkDependencies();
    const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

    // act
    await sendPaymentLinkUseCase.execute({ assessmentCallId: call.id });

    // assert
    expect(dependencies.paymentLinksPort.voidOtherLinksOf).toHaveBeenCalledWith(
      call.id,
      NEW_LINK_ID,
    );
    const [issued] = vi.mocked(dependencies.paymentLinksPort.issue).mock
      .invocationCallOrder;
    const [sent] = vi.mocked(
      dependencies.coachingSalesNotificationsPort.sendPaymentLink,
    ).mock.invocationCallOrder;
    const [voided] = vi.mocked(dependencies.paymentLinksPort.voidOtherLinksOf)
      .mock.invocationCallOrder;
    expect(issued).toBeLessThan(sent!);
    expect(sent).toBeLessThan(voided!);
  });

  it.each<[string, CoachingSalesNotificationsPort]>([
    ["reports a failed delivery", createNotifications("failed")],
    [
      "throws",
      {
        sendPaymentLink: vi.fn().mockRejectedValue(new Error("mail down")),
      },
    ],
  ])(
    "voids only the new link, keeps the earlier ones working and records the incident when the email %s",
    async (_label, coachingSalesNotificationsPort) => {
      // arrange
      const dependencies = sendPaymentLinkDependencies({
        coachingSalesNotificationsPort,
      });
      const sendPaymentLinkUseCase = new SendPaymentLinkUseCase(dependencies);

      // act
      const result = await sendPaymentLinkUseCase.execute({
        assessmentCallId: call.id,
      });

      // assert
      expect(result).toEqual({ status: "delivery_failed" });
      expect(vi.mocked(dependencies.paymentLinksPort.void).mock.calls).toEqual([
        [NEW_LINK_ID],
      ]);
      expect(
        dependencies.paymentLinksPort.voidOtherLinksOf,
      ).not.toHaveBeenCalled();
      expect(
        dependencies.coachingSalesIncidentsPort.paymentLinkEmailFailed,
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
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      dependencies,
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "closed" });
    expect(
      dependencies.paymentLinksPort.findByTokenSha256,
    ).not.toHaveBeenCalled();
  });

  it("answers invalid for an implausible token without hashing or a lookup", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies();
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      dependencies,
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute("abcde");

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(
      dependencies.paymentLinkTokenHasherPort.sha256,
    ).not.toHaveBeenCalled();
    expect(
      dependencies.paymentLinksPort.findByTokenSha256,
    ).not.toHaveBeenCalled();
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
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      resolvePaymentLinkDependencies({
        paymentLinksPort: createPaymentLinks(found),
      }),
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("answers invalid when the link's call no longer exists", async () => {
    // arrange
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      resolvePaymentLinkDependencies({ endedCallsPort: createCalls(null) }),
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
  });

  it("answers invalid for a still-valid link whose call is already paid", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies({
      callSalesStatesPort: createCallSalesStates(
        new Map([[call.id, { state: "paid", clientId: "client-1" }]]),
      ),
    });
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      dependencies,
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({ status: "invalid" });
    expect(dependencies.callSalesStatesPort.forCalls).toHaveBeenCalledWith([
      call.id,
    ]);
    expect(
      dependencies.pricingEligibilityPort.tierForEmail,
    ).not.toHaveBeenCalled();
  });

  it("resolves a usable link with its call and the visitor's tier", async () => {
    // arrange
    const dependencies = resolvePaymentLinkDependencies({
      pricingEligibilityPort: createPricingEligibility("reduced"),
    });
    const resolvePaymentLinkUseCase = new ResolvePaymentLinkUseCase(
      dependencies,
    );

    // act
    const result = await resolvePaymentLinkUseCase.execute(RAW_TOKEN);

    // assert
    expect(result).toEqual({
      status: "valid",
      link: usableLink,
      call,
      tier: "reduced",
    });
    expect(dependencies.paymentLinkTokenHasherPort.sha256).toHaveBeenCalledWith(
      RAW_TOKEN,
    );
    expect(
      dependencies.paymentLinksPort.findByTokenSha256,
    ).toHaveBeenCalledWith(TOKEN_SHA256);
    expect(dependencies.endedCallsPort.findById).toHaveBeenCalledWith(
      usableLink.assessmentCallId,
    );
    expect(
      dependencies.pricingEligibilityPort.tierForEmail,
    ).toHaveBeenCalledWith(call.visitorEmail);
  });
});

describe("OpenBundlePageUseCase", () => {
  it("answers open while sales are open", async () => {
    // arrange
    const openBundlePageUseCase = new OpenBundlePageUseCase({
      salesWindow: openSalesWindow(),
    });

    // act
    const result = await openBundlePageUseCase.execute();

    // assert
    expect(result).toEqual({ status: "open" });
  });

  it("answers closed while sales are closed", async () => {
    // arrange
    const openBundlePageUseCase = new OpenBundlePageUseCase({
      salesWindow: closedSalesWindow(),
    });

    // act
    const result = await openBundlePageUseCase.execute();

    // assert
    expect(result).toEqual({ status: "closed" });
  });
});

describe("ReadCallSalesStatesUseCase", () => {
  it("answers a sales state for every requested call with the client a paid call created", async () => {
    // arrange
    const states = new Map<
      string,
      { state: CallSalesState; clientId: string | null }
    >([
      ["call-1", { state: "held", clientId: null }],
      ["call-2", { state: "payment-link-sent", clientId: null }],
      ["call-3", { state: "paid", clientId: "client-3" }],
    ]);
    const callSalesStatesPort = createCallSalesStates(states);
    const readCallSalesStatesUseCase = new ReadCallSalesStatesUseCase({
      callSalesStatesPort,
    });

    // act
    const result = await readCallSalesStatesUseCase.execute([
      "call-1",
      "call-2",
      "call-3",
    ]);

    // assert
    expect(result).toBe(states);
    expect(callSalesStatesPort.forCalls).toHaveBeenCalledWith([
      "call-1",
      "call-2",
      "call-3",
    ]);
  });
});
