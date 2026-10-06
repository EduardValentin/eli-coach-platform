import { describe, expect, it, vi } from "vitest";

import { ApproveOnboardingAnswersUseCase } from "./approve-onboarding-answers-use-case";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import { DetailRequest } from "./detail-request";
import { emptyAnswers } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import type { OnboardingDetailsNotifications } from "./onboarding-details-notifications";
import type {
  OnboardingReviewStamps,
  ReviewStamps,
} from "./onboarding-review-stamps";
import type {
  DetailRequestIdGenerator,
  OnboardingReviews,
} from "./onboarding-reviews";
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
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
  gender: "female",
  dateOfBirth: "1994-03-14",
  submittedAt: SUBMITTED_AT,
  reviewStamps: NO_STAMPS,
  subscriptionCancelledOrEnded: false,
};

const CANCELLED_OR_ENDED_CLIENT: OnboardingClient = {
  ...CLIENT,
  subscriptionCancelledOrEnded: true,
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

type StoredReview = Awaited<ReturnType<OnboardingReviews["findByClientId"]>>;

function createClients(found: OnboardingClient | null = CLIENT) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClients;
}

function createOnboardings(
  submission: OnboardingSubmission | null = SUBMISSION,
) {
  return {
    findByClientId: vi.fn().mockResolvedValue({ draft: null, submission }),
  } satisfies ClientOnboardingSource;
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
  } satisfies OnboardingReviews;
}

function createStamps() {
  return {
    record: vi.fn().mockResolvedValue(undefined),
  } satisfies OnboardingReviewStamps;
}

function createNotifications(delivery: "sent" | "failed" = "sent") {
  return {
    sendDetailsRequest: vi.fn().mockResolvedValue(delivery),
  } satisfies OnboardingDetailsNotifications;
}

function createRequestIds() {
  return {
    generate: vi.fn().mockReturnValue("request-1"),
  } satisfies DetailRequestIdGenerator;
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
  } satisfies ClientOnboardingIncidents;
}

function reviewPorts(
  overrides: {
    client?: OnboardingClient | null;
    submission?: OnboardingSubmission | null;
    stored?: Partial<StoredReview>;
  } = {},
) {
  return {
    clients: createClients(
      overrides.client === undefined ? CLIENT : overrides.client,
    ),
    onboardings: createOnboardings(
      overrides.submission === undefined ? SUBMISSION : overrides.submission,
    ),
    reviews: createReviews(overrides.stored),
    clock: { now: () => NOW },
    incidents: createIncidents(),
  };
}

function readPorts(overrides: Parameters<typeof reviewPorts>[0] = {}) {
  return { ...reviewPorts(overrides), stamps: createStamps() };
}

describe("OpenOnboardingReviewUseCase", () => {
  it("records the opened review with its stamps in one write and logs it", async () => {
    // arrange
    const ports = reviewPorts();
    const useCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "opened" });
    expect(ports.reviews.recordOpened).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      at: NOW,
      stamps: { ...NO_STAMPS, reviewOpenedAt: NOW },
    });
    expect(ports.incidents.onboardingReviewOpened).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
    });
  });

  it("answers already-open without writing", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const useCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "already-open" });
    expect(ports.reviews.recordOpened).not.toHaveBeenCalled();
  });

  it.each([
    ["not-found", { client: null }],
    ["not-submitted", { submission: null }],
  ] as const)("answers %s", async (expected, overrides) => {
    // arrange
    const ports = reviewPorts(overrides);
    const useCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: expected });
    expect(ports.reviews.recordOpened).not.toHaveBeenCalled();
  });

  it("refuses to open the review once her coaching is cancelled or ended", async () => {
    // arrange
    const ports = reviewPorts({ client: CANCELLED_OR_ENDED_CLIENT });
    const useCase = new OpenOnboardingReviewUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.reviews.recordOpened).not.toHaveBeenCalled();
    expect(ports.incidents.onboardingReviewOpened).not.toHaveBeenCalled();
  });
});

describe("RequestOnboardingDetailsUseCase", () => {
  function requestUseCase(
    ports: ReturnType<typeof reviewPorts>,
    notifications = createNotifications(),
  ) {
    return new RequestOnboardingDetailsUseCase({
      ...ports,
      requestIds: createRequestIds(),
      notifications,
    });
  }

  it("records the request with its stamps in one write, then emails her", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const notifications = createNotifications();
    const useCase = requestUseCase(ports, notifications);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "requested" });
    expect(ports.reviews.recordRequest).toHaveBeenCalledWith({
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
      email: CLIENT.email,
      firstName: CLIENT.firstName,
    });
    expect(
      ports.reviews.recordRequest.mock.invocationCallOrder[0],
    ).toBeLessThan(
      notifications.sendDetailsRequest.mock.invocationCallOrder[0],
    );
    expect(ports.incidents.onboardingDetailsRequested).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      questionCount: 1,
    });
  });

  it("keeps the request standing and logs it when the email fails", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const notifications = {
      sendDetailsRequest: vi.fn().mockRejectedValue(new Error("down")),
    } satisfies OnboardingDetailsNotifications;
    const useCase = requestUseCase(ports, notifications);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "requested" });
    expect(ports.reviews.recordRequest).toHaveBeenCalled();
    expect(
      ports.incidents.onboardingDetailsRequestEmailFailed,
    ).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      requestId: "request-1",
    });
  });

  it("answers not-in-review without emailing when another request was recorded first", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    ports.reviews.recordRequest.mockResolvedValue("already-open");
    const notifications = createNotifications();
    const useCase = requestUseCase(ports, notifications);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-in-review" });
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
    expect(ports.incidents.onboardingDetailsRequested).not.toHaveBeenCalled();
  });

  it("refuses a second request while one is open and writes nothing", async () => {
    // arrange
    const ports = reviewPorts({
      stored: { openedAt: OPENED_AT, requests: [openRequest()] },
    });
    const notifications = createNotifications();
    const useCase = requestUseCase(ports, notifications);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "not-in-review" });
    expect(ports.reviews.recordRequest).not.toHaveBeenCalled();
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
  });

  it("refuses an empty note as invalid", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const useCase = requestUseCase(ports);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: " ",
    });

    // assert
    expect(result).toEqual({ status: "invalid", reason: "empty-note" });
    expect(ports.reviews.recordRequest).not.toHaveBeenCalled();
  });

  it("answers not-found for an unknown client", async () => {
    // arrange
    const ports = reviewPorts({ client: null });
    const useCase = requestUseCase(ports);

    // act
    const result = await useCase.execute({
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
    const useCase = requestUseCase(ports, notifications);

    // act
    const result = await useCase.execute({
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: NOTE,
    });

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.reviews.recordRequest).not.toHaveBeenCalled();
    expect(notifications.sendDetailsRequest).not.toHaveBeenCalled();
  });
});

describe("ApproveOnboardingAnswersUseCase", () => {
  it("records the approval with its stamps in one write and logs it", async () => {
    // arrange
    const ports = reviewPorts({ stored: { openedAt: OPENED_AT } });
    const useCase = new ApproveOnboardingAnswersUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "approved" });
    expect(ports.reviews.recordOpened).not.toHaveBeenCalled();
    expect(ports.reviews.recordApproval).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      at: NOW,
      stamps: {
        ...NO_STAMPS,
        reviewOpenedAt: OPENED_AT,
        answersApprovedAt: NOW,
      },
    });
    expect(ports.incidents.onboardingAnswersApproved).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
    });
  });

  it("opens an unopened review within the approval write", async () => {
    // arrange
    const ports = reviewPorts();
    const useCase = new ApproveOnboardingAnswersUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "approved" });
    expect(ports.reviews.recordOpened).not.toHaveBeenCalled();
    expect(ports.reviews.recordApproval).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      at: NOW,
      stamps: { ...NO_STAMPS, reviewOpenedAt: NOW, answersApprovedAt: NOW },
    });
  });

  it("refuses while a request is open", async () => {
    // arrange
    const ports = reviewPorts({
      stored: { openedAt: OPENED_AT, requests: [openRequest()] },
    });
    const useCase = new ApproveOnboardingAnswersUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "not-reviewable" });
    expect(ports.reviews.recordApproval).not.toHaveBeenCalled();
  });

  it("answers not-found for an unknown client", async () => {
    // arrange
    const ports = reviewPorts({ client: null });
    const useCase = new ApproveOnboardingAnswersUseCase(ports);

    // act
    const result = await useCase.execute("client-9");

    // assert
    expect(result).toEqual({ status: "not-found" });
  });

  it("refuses the approval once her coaching is cancelled or ended", async () => {
    // arrange
    const ports = reviewPorts({
      client: CANCELLED_OR_ENDED_CLIENT,
      stored: { openedAt: OPENED_AT },
    });
    const useCase = new ApproveOnboardingAnswersUseCase(ports);

    // act
    const result = await useCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "subscription-cancelled-or-ended" });
    expect(ports.reviews.recordApproval).not.toHaveBeenCalled();
    expect(ports.incidents.onboardingAnswersApproved).not.toHaveBeenCalled();
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
    const useCase = new ReadOpenDetailRequestUseCase(ports);

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toEqual({
      requestId: "request-1",
      note: NOTE,
      fields: [WEIGHT],
    });
    expect(ports.clients.findByAuthSubjectId).toHaveBeenCalledWith("user_ana");
    expect(ports.stamps.record).not.toHaveBeenCalled();
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
    const useCase = new ReadOpenDetailRequestUseCase(ports);

    // act
    const result = await useCase.execute("user_ana");

    // assert
    expect(result).toBeNull();
    expect(ports.stamps.record).toHaveBeenCalledWith({
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
    const useCase = new ReadOpenDetailRequestUseCase(ports);

    // act
    const result = await useCase.execute("user_unknown");

    // assert
    expect(result).toBeNull();
  });
});
