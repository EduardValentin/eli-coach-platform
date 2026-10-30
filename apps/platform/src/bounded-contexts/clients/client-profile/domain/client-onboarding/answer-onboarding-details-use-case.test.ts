import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import type { ClientSettingsSourcePort } from "../client-settings";
import { AnswerOnboardingDetailsUseCase } from "./answer-onboarding-details-use-case";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { DetailRequest } from "./detail-request";
import { emptyAnswers, type OnboardingQuestionId } from "./onboarding-answers";
import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";
import { OnboardingParticipants } from "./onboarding-participants";
import type {
  OnboardingReviewStampsPort,
  ReviewStamps,
} from "./onboarding-review-stamps-port";
import type { OnboardingReviewsPort } from "./onboarding-reviews-port";
import type { OnboardingSubmission } from "./onboarding-submission";
import { ReadOpenDetailRequestUseCase } from "./read-open-detail-request-use-case";

const SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const OPENED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T10:00:00.000Z");
const NOW = new Date("2026-09-30T10:00:00.000Z");
const WEIGHT = { formId: "goal-availability", fieldId: "weight" } as const;
const HEIGHT = { formId: "goal-availability", fieldId: "height" } as const;

const REQUESTED_STAMPS: ReviewStamps = {
  reviewOpenedAt: OPENED_AT,
  detailsRequestedAt: ASKED_AT,
  detailsAnsweredAt: null,
  answersApprovedAt: null,
};

const CLIENT: OnboardingClient = {
  clientId: "client-1",
  submittedAt: SUBMITTED_AT,
  reviewStamps: REQUESTED_STAMPS,
  standing: CoachingStanding.of({
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
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

const ENDED_ACCESS_AT = new Date("2026-09-29T10:00:00.000Z");
const RUNNING_ACCESS_ENDS_AT = new Date("2026-10-30T10:00:00.000Z");

function clientWithAccessEndingAt(accessEndsAt: Date): OnboardingClient {
  return {
    ...CLIENT,
    standing: CoachingStanding.of({
      status: "cancelled",
      accessEndsAt,
      refundDue: false,
      bundleMonths: 3,
      programStartsAt: null,
      paidThrough: null,
    }),
  };
}

function askedRequest(
  questionIds: readonly OnboardingQuestionId[] = [WEIGHT],
): DetailRequest {
  return DetailRequest.raise({
    id: "request-1",
    clientId: CLIENT.clientId,
    questionIds,
    note: "Please weigh yourself in the morning.",
    askedAt: ASKED_AT,
  });
}

function createReviews(requests: DetailRequest[]) {
  return {
    findByClientId: vi
      .fn()
      .mockResolvedValue({ openedAt: OPENED_AT, approvedAt: null, requests }),
    recordOpened: vi.fn().mockResolvedValue(undefined),
    recordRequest: vi.fn().mockResolvedValue(undefined),
    recordAnswer: vi.fn().mockResolvedValue(undefined),
    recordApproval: vi.fn().mockResolvedValue(undefined),
  } satisfies OnboardingReviewsPort;
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

function answerPorts(
  overrides: {
    client?: OnboardingClient | null;
    requests?: DetailRequest[];
  } = {},
) {
  return {
    participants: new OnboardingParticipants({
      clients: {
        findByAuthSubjectId: vi
          .fn()
          .mockResolvedValue(
            overrides.client === undefined ? CLIENT : overrides.client,
          ),
        findByClientId: vi.fn().mockResolvedValue(null),
      } satisfies OnboardingClientsPort,
      identities: {
        findByClientId: vi.fn().mockResolvedValue(IDENTITY),
      } satisfies Pick<ClientIdentitiesPort, "findByClientId">,
    }),
    onboardings: {
      findByClientId: vi
        .fn()
        .mockResolvedValue({ draft: null, submission: SUBMISSION }),
    } satisfies ClientOnboardingSourcePort,
    reviews: createReviews(overrides.requests ?? [askedRequest()]),
    settings: {
      findByClientId: vi.fn().mockResolvedValue(null),
    } satisfies ClientSettingsSourcePort,
    stamps: {
      record: vi.fn().mockResolvedValue(undefined),
    } satisfies OnboardingReviewStampsPort,
    clock: { now: () => NOW },
    incidents: createIncidents(),
  };
}

describe("AnswerOnboardingDetailsUseCase", () => {
  it("records her asked answers and the answered request with the stamps that return her to in-review", async () => {
    // arrange
    const ports = answerPorts();
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72 } },
    });

    // assert
    expect(result).toEqual({ status: "answered" });
    expect(ports.reviews.recordAnswer).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      requestId: "request-1",
      mergedAnswers: {
        ...emptyAnswers(),
        "goal-availability": { weight: 72 },
      },
      answeredAt: NOW,
      stamps: { ...REQUESTED_STAMPS, detailsAnsweredAt: NOW },
    });
    expect(ports.incidents.onboardingDetailsAnswered).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      questionCount: 1,
    });
  });

  it("the answer and its stamps are one port write; a lagging stamp is repaired on read", async () => {
    // arrange
    const ports = answerPorts();
    ports.reviews.findByClientId
      .mockResolvedValueOnce({
        openedAt: OPENED_AT,
        approvedAt: null,
        requests: [askedRequest()],
      })
      .mockResolvedValue({
        openedAt: OPENED_AT,
        approvedAt: null,
        requests: [askedRequest().answer(NOW)],
      });
    const answering = new AnswerOnboardingDetailsUseCase(ports);
    const reading = new ReadOpenDetailRequestUseCase(ports);

    // act
    await answering.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72 } },
    });
    const stampsAfterAnswer = ports.stamps.record.mock.calls.length;
    const openRequest = await reading.execute("user_ana");

    // assert
    expect(ports.reviews.recordAnswer).toHaveBeenCalledWith(
      expect.objectContaining({
        stamps: { ...REQUESTED_STAMPS, detailsAnsweredAt: NOW },
      }),
    );
    expect(stampsAfterAnswer).toBe(0);
    expect(openRequest).toBeNull();
    expect(ports.stamps.record).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      stamps: { ...REQUESTED_STAMPS, detailsAnsweredAt: NOW },
    });
    expect(ports.incidents.onboardingReviewStampsRepaired).toHaveBeenCalledWith(
      { clientId: CLIENT.clientId },
    );
  });

  it("refuses an answer to a question she was not asked and writes nothing", async () => {
    // arrange
    const ports = answerPorts();
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72, height: 150 } },
    });

    // assert
    expect(result).toEqual({
      status: "invalid",
      problems: [
        {
          formId: "goal-availability",
          fieldId: "height",
          message: "This question was not asked.",
        },
      ],
    });
    expect(ports.reviews.recordAnswer).not.toHaveBeenCalled();
    expect(ports.incidents.onboardingDetailsRefused).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      reason: "invalid",
    });
  });

  it("answers not-on-journey for a subject with no client", async () => {
    // arrange
    const ports = answerPorts({ client: null });
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_unknown",
      answers: {},
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(ports.reviews.findByClientId).not.toHaveBeenCalled();
  });

  it("answers nothing for a client whose portal access has ended", async () => {
    // arrange
    const ports = answerPorts({
      client: clientWithAccessEndingAt(ENDED_ACCESS_AT),
    });
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 82 } },
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(ports.reviews.recordAnswer).not.toHaveBeenCalled();
  });

  it("records the answers of a client who cancelled while her access runs on", async () => {
    // arrange
    const ports = answerPorts({
      client: clientWithAccessEndingAt(RUNNING_ACCESS_ENDS_AT),
    });
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    const result = await useCase.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 82 } },
    });

    // assert
    expect(result).toEqual({ status: "answered" });
  });
});
