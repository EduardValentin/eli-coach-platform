import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";

import { ApproveOnboardingAnswersUseCase } from "./approve-onboarding-answers-use-case";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { DetailRequest } from "./detail-request";
import { emptyAnswers } from "./onboarding-answers";
import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";
import type { OnboardingDetailsNotificationsPort } from "./onboarding-details-notifications-port";
import { OnboardingParticipants } from "./onboarding-participants";
import type {
  OnboardingReviewStampsPort,
  ReviewStamps,
} from "./onboarding-review-stamps-port";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";
import type { DetailRequestIdsPort } from "./detail-request-ids-port";
import type { OnboardingSubmission } from "./onboarding-submission";
import { OpenOnboardingReviewUseCase } from "./open-onboarding-review-use-case";
import { ReadOpenDetailRequestUseCase } from "./read-open-detail-request-use-case";
import { RequestOnboardingDetailsUseCase } from "./request-onboarding-details-use-case";

const SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const OPENED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T10:00:00.000Z");
const NOW = new Date("2026-09-30T10:00:00.000Z");
const WEIGHT = { formId: "goal-availability", fieldId: "weight" } as const;
const NOTE = "Please weigh yourself in the morning.";

const NO_STAMPS: ReviewStamps = {
  reviewOpenedAt: null,
  detailsRequestedAt: null,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

const CLIENT: OnboardingClient = {
  clientId: "client-1",
  submittedAt: SUBMITTED_AT,
  reviewStamps: NO_STAMPS,
  standing: CoachingStanding.of({
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
    programStartsAt: null,
    paidThrough: null,
  }),
};

const CANCELLED_OR_ENDED_CLIENT: OnboardingClient = {
  ...CLIENT,
  standing: CoachingStanding.of({
    status: "ended",
    accessEndsAt: ASKED_AT,
    refundDue: false,
    bundleMonths: 3,
    programStartsAt: null,
    paidThrough: null,
  }),
};

const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
  gender: "female",
  dateOfBirth: "1994-03-14",
};

const SUBMISSION: OnboardingSubmission = {
  answers: {
    ...emptyAnswers(),
    "goal-availability": { weight: 70, height: 168 },
  },
  consents: {
    specialCategoryAt: SUBMITTED_AT,
    disclaimerAt: SUBMITTED_AT,
    progressPhotosAt: null,
  },
  submittedAt: SUBMITTED_AT,
};

function openRequest(): DetailRequest {
  return DetailRequest.raise({
    id: "request-1",
    clientId: CLIENT.clientId,
    questionIds: [WEIGHT],
    note: NOTE,
    askedAt: ASKED_AT,
  });
}

type StoredReview = Awaited<
  ReturnType<OnboardingReviewsPort["findByClientId"]>
>;

function createClients(found: OnboardingClient | null = CLIENT) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClientsPort;
}

function createIdentities(found: ClientIdentity | null = IDENTITY) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientIdentitiesPort, "findByClientId">;
}

function createOnboardings(
  submission: OnboardingSubmission | null = SUBMISSION,
) {
  return {
    findByClientId: vi.fn().mockResolvedValue({ draft: null, submission }),
  } satisfies ClientOnboardingSourcePort;
}

function createReviews(stored: Partial<StoredReview> = {}) {
  return {
    findByClientId: vi.fn().mockResolvedValue({
      openedAt: null,
      approvedAt: null,
      requests: [],
      ...stored,
    }),
    recordOpened: vi.fn().mockResolvedValue(undefined),
    recordRequest: vi.fn().mockResolvedValue("recorded"),
    recordAnswer: vi.fn().mockResolvedValue(undefined),
    recordApproval: vi.fn().mockResolvedValue(undefined),
  } satisfies OnboardingReviewsPort;
}

function createStamps() {
  return {
    record: vi.fn().mockResolvedValue(undefined),
  } satisfies OnboardingReviewStampsPort;
}

function createNotifications(delivery: "sent" | "failed" = "sent") {
  return {
    sendDetailsRequest: vi.fn().mockResolvedValue(delivery),
  } satisfies OnboardingDetailsNotificationsPort;
}

function createRequestIds() {
  return {
    generate: vi.fn().mockReturnValue("request-1"),
  } satisfies DetailRequestIdsPort;
}

function createIncidents() {
  return {
    onboardingDraftSaved: vi.fn(),
    onboardingDraftSaveFailed: vi.fn(),
    onboardingSubmissionAccepted: vi.fn(),
    onboardingSubmissionRefused: vi.fn(),
    onboardingReviewOpened: vi.fn(),
    onboardingDetailsRequested: vi.fn(),
    onboardingDetailsRequestEmailFailed: vi.fn(),
    onboardingDetailsAnswered: vi.fn(),
    onboardingDetailsRefused: vi.fn(),
    onboardingAnswersApproved: vi.fn(),
    onboardingReviewStampsRepaired: vi.fn(),
  } satisfies ClientOnboardingIncidentsPort;
}

function reviewPorts(
  overrides: {
    client?: OnboardingClient | null;
    identity?: ClientIdentity | null;
    submission?: OnboardingSubmission | null;
    stored?: Partial<StoredReview>;
  } = {},
) {
  const clients = createClients(
    overrides.client === undefined ? CLIENT : overrides.client,
  );

  return {
    clients,
    participants: new OnboardingParticipants({
      onboardingClientsPort: clients,
      clientIdentitiesPort: createIdentities(
        overrides.identity === undefined ? IDENTITY : overrides.identity,
      ),
    }),
    clientOnboardingSourcePort: createOnboardings(
      overrides.submission === undefined ? SUBMISSION : overrides.submission,
    ),
    onboardingReviewsPort: createReviews(overrides.stored),
    clockPort: { now: () => NOW },
    clientOnboardingIncidentsPort: createIncidents(),
  };
}

function readPorts(overrides: Parameters<typeof reviewPorts>[0] = {}) {
  return {
    ...reviewPorts(overrides),
    onboardingReviewStampsPort: createStamps(),
  };
}

describe("OpenOnboardingReviewUseCase", () => {
  it("records the opened review with its stamps in one write and logs it", async () => {
    // arrange
    const ports = reviewPorts();
    const openOnboardingReviewUseCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await openOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "opened" });
    expect(ports.onboardingReviewsPort.recordOpened).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      at: NOW,
      stamps: { ...NO_STAMPS, reviewOpenedAt: NOW },
    });
    expect(
      ports.clientOnboardingIncidentsPort.onboardingReviewOpened,
    ).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
    });
  });

  it("answers already-open without writing", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const openOnboardingReviewUseCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await openOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "already-open" });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", { client: null }],
    ["not-submitted", { submission: null }],
  ] as const)("answers %s", async (expected, overrides) => {
    // arrange
    const ports = reviewPorts(overrides);
    const openOnboardingReviewUseCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await openOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: expected });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
  });

  it("refuses to open the review once her coaching is cancelled or ended", async () => {
    // arrange
    const ports = reviewPorts({ client: CANCELLED_OR_ENDED_CLIENT });
    const openOnboardingReviewUseCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await openOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
    expect(
      ports.clientOnboardingIncidentsPort.onboardingReviewOpened,
    ).not.toHaveBeenCalled();
  });

  it("answers not-found for a client with no identity", async () => {
    // arrange
    const ports = reviewPorts({ identity: null });
    const openOnboardingReviewUseCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await openOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
  });
});

describe("RequestOnboardingDetailsUseCase", () => {
  function requestUseCase(
    ports: ReturnType<typeof reviewPorts>,
    notifications = createNotifications(),
  ) {
    return new RequestOnboardingDetailsUseCase({
      ...ports,
      detailRequestIdsPort: createRequestIds(),
      onboardingDetailsNotificationsPort: notifications,
    });
  }

  it("records the request with its stamps in one write, then emails her", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const notifications = createNotifications();
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "requested" });
    expect(ports.onboardingReviewsPort.recordRequest).toHaveBeenCalledWith({
      request: DetailRequest.raise({
        id: "request-1",
        clientId: CLIENT.clientId,
        questionIds: [WEIGHT],
        note: NOTE,
        askedAt: NOW,
      }),
      stamps: {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        detailsRequestedAt: NOW,
      },
    });
    expect(notifications.sendDetailsRequest).toHaveBeenCalledWith({
      requestId: "request-1",
      clientId: CLIENT.clientId,
      email: IDENTITY.email,
      firstName: IDENTITY.firstName,
    });
    expect(
      ports.onboardingReviewsPort.recordRequest.mock.invocationCallOrder[0],
    ).toBeLessThan(
      notifications.sendDetailsRequest.mock.invocationCallOrder[0],
    );
    expect(
      ports.clientOnboardingIncidentsPort.onboardingDetailsRequested,
    ).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      questionCount: 1,
    });
  });

  it("keeps the request standing and logs it when the email fails", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const notifications = {
      sendDetailsRequest: vi.fn().mockRejectedValue(new Error("down")),
    } satisfies OnboardingDetailsNotificationsPort;
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "requested" });
    expect(ports.onboardingReviewsPort.recordRequest).toHaveBeenCalled();
    expect(
      ports.clientOnboardingIncidentsPort.onboardingDetailsRequestEmailFailed,
    ).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      requestId: "request-1",
    });
  });

  it("answers not-in-review without emailing when another request was recorded first", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    ports.onboardingReviewsPort.recordRequest.mockResolvedValue("already-open");
    const notifications = createNotifications();
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-in-review" });
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
    expect(
      ports.clientOnboardingIncidentsPort.onboardingDetailsRequested,
    ).not.toHaveBeenCalled();
  });

  it("refuses a second request while one is open and writes nothing", async () => {
    // arrange
    const ports = reviewPorts({
      stored: { openedAt: OPENED_AT, requests: [openRequest()] },
    });
    const notifications = createNotifications();
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-in-review" });
    expect(ports.onboardingReviewsPort.recordRequest).not.toHaveBeenCalled();
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
  });

  it("refuses an empty note as invalid", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const requestOnboardingDetailsUseCase = requestUseCase(ports);

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: " ",
    });

    // assert
    expect(result).toEqual({ status: "invalid", reason: "empty-note" });
    expect(ports.onboardingReviewsPort.recordRequest).not.toHaveBeenCalled();
  });

  it("answers not-found for an unknown client", async () => {
    // arrange
    const ports = reviewPorts({ client: null });
    const requestOnboardingDetailsUseCase = requestUseCase(ports);

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: "client-9",
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("refuses a request once her coaching is cancelled or ended, emailing nothing", async () => {
    // arrange
    const ports = reviewPorts({
      client: CANCELLED_OR_ENDED_CLIENT,
      stored: { openedAt: OPENED_AT },
    });
    const notifications = createNotifications();
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.onboardingReviewsPort.recordRequest).not.toHaveBeenCalled();
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
  });

  it("answers not-found for a client with no identity, emailing nothing", async () => {
    // arrange
    const ports = reviewPorts({
      identity: null,
      stored: { openedAt: OPENED_AT },
    });
    const notifications = createNotifications();
    const requestOnboardingDetailsUseCase = requestUseCase(
      ports,
      notifications,
    );

    // act
    const result = await requestOnboardingDetailsUseCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.onboardingReviewsPort.recordRequest).not.toHaveBeenCalled();
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
  });
});

describe("ApproveOnboardingAnswersUseCase", () => {
  it("records the approval with its stamps and the coaching seed of her answers in one write and logs it", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute(
      CLIENT.clientId,
    );

    // assert
    expect(result).toEqual({ status: "approved" });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
    expect(ports.onboardingReviewsPort.recordApproval).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      at: NOW,
      stamps: {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        answersApprovedAt: NOW,
      },
      seed: {
        coaching: {
          heightCm: 168,
          trainingDays: 3,
          sessionMinutes: 60,
          equipment: [],
          trainingPlace: null,
          limitations: "",
          level: "beginner",
          primaryGoal: null,
          goalWeightKg: null,
          activityLevel: null,
          cycleMode: "general",
          dietaryRestrictions: "None",
        },
        preferences: { preferredCheckInWeekday: null, preferredChannel: null },
      },
    });
    expect(
      ports.clientOnboardingIncidentsPort.onboardingAnswersApproved,
    ).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
    });
  });

  it("opens an unopened review within the approval write", async () => {
    // arrange
    const ports = reviewPorts();
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute(
      CLIENT.clientId,
    );

    // assert
    expect(result).toEqual({ status: "approved" });
    expect(ports.onboardingReviewsPort.recordOpened).not.toHaveBeenCalled();
    expect(ports.onboardingReviewsPort.recordApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: CLIENT.clientId,
        at: NOW,
        stamps: { ...NO_STAMPS, reviewOpenedAt: NOW, answersApprovedAt: NOW },
      }),
    );
  });

  it("refuses while a request is open", async () => {
    // arrange
    const ports = reviewPorts({
      stored: { openedAt: OPENED_AT, requests: [openRequest()] },
    });
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute(
      CLIENT.clientId,
    );

    // assert
    expect(result).toEqual({ status: "not-reviewable" });
    expect(ports.onboardingReviewsPort.recordApproval).not.toHaveBeenCalled();
  });

  it("answers not-found for an unknown client", async () => {
    // arrange
    const ports = reviewPorts({ client: null });
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute("client-9");

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("refuses the approval once her coaching is cancelled or ended", async () => {
    // arrange
    const ports = reviewPorts({
      client: CANCELLED_OR_ENDED_CLIENT,
      stored: { openedAt: OPENED_AT },
    });
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute(
      CLIENT.clientId,
    );

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.onboardingReviewsPort.recordApproval).not.toHaveBeenCalled();
    expect(
      ports.clientOnboardingIncidentsPort.onboardingAnswersApproved,
    ).not.toHaveBeenCalled();
  });

  it("answers not-found for a client with no identity", async () => {
    // arrange
    const ports = reviewPorts({
      identity: null,
      stored: { openedAt: OPENED_AT },
    });
    const approveOnboardingAnswersUseCase = new ApproveOnboardingAnswersUseCase(
      ports,
    );

    // act
    const result = await approveOnboardingAnswersUseCase.execute(
      CLIENT.clientId,
    );

    // assert
    expect(result).toEqual({ status: "not-found" });
    expect(ports.onboardingReviewsPort.recordApproval).not.toHaveBeenCalled();
  });
});

describe("ReadOpenDetailRequestUseCase", () => {
  it("reads her open request with the note and the asked fields", async () => {
    // arrange
    const ports = readPorts({
      client: {
        ...CLIENT,
        reviewStamps: {
          ...NO_STAMPS,
          reviewOpenedAt: OPENED_AT,
          detailsRequestedAt: ASKED_AT,
        },
      },
      stored: { openedAt: OPENED_AT, requests: [openRequest()] },
    });
    const readOpenDetailRequestUseCase = new ReadOpenDetailRequestUseCase(
      ports,
    );

    // act
    const result = await readOpenDetailRequestUseCase.execute("user_ana");

    // assert
    expect(result).toEqual({
      requestId: "request-1",
      note: NOTE,
      fields: [WEIGHT],
    });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.onboardingReviewStampsPort.record).not.toHaveBeenCalled();
  });

  it("re-applies a lagging projection and reads nothing when no request is open", async () => {
    // arrange
    const ports = readPorts({
      client: {
        ...CLIENT,
        reviewStamps: {
          ...NO_STAMPS,
          reviewOpenedAt: OPENED_AT,
          detailsRequestedAt: ASKED_AT,
        },
      },
      stored: {
        openedAt: OPENED_AT,
        requests: [openRequest().answer(NOW)],
      },
    });
    const readOpenDetailRequestUseCase = new ReadOpenDetailRequestUseCase(
      ports,
    );

    // act
    const result = await readOpenDetailRequestUseCase.execute("user_ana");

    // assert
    expect(result).toBeNull();
    expect(ports.onboardingReviewStampsPort.record).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      stamps: {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        detailsRequestedAt: ASKED_AT,
        detailsAnsweredAt: NOW,
      },
    });
  });

  it("reads nothing for a subject with no client", async () => {
    // arrange
    const ports = readPorts({ client: null });
    const readOpenDetailRequestUseCase = new ReadOpenDetailRequestUseCase(
      ports,
    );

    // act
    const result = await readOpenDetailRequestUseCase.execute("user_unknown");

    // assert
    expect(result).toBeNull();
  });

  it("reads nothing for a client with no identity", async () => {
    // arrange
    const ports = readPorts({ identity: null });
    const readOpenDetailRequestUseCase = new ReadOpenDetailRequestUseCase(
      ports,
    );

    // act
    const result = await readOpenDetailRequestUseCase.execute("user_ana");

    // assert
    expect(result).toBeNull();
    expect(ports.onboardingReviewStampsPort.record).not.toHaveBeenCalled();
  });
});
