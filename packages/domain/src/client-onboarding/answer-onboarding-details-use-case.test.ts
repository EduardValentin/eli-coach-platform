import { describe, expect, it, vi } from "vitest";

import { ClientProfile } from "../client-profile";
import type { MeasurementEntry } from "../measurement";
import type { ClientUnitPreferences } from "../unit-preference";
import { AnswerOnboardingDetailsUseCase } from "./answer-onboarding-details-use-case";
import type { ClientMeasurementsSource } from "./client-measurements-source";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import { DetailRequest } from "./detail-request";
import { emptyAnswers } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import type {
  OnboardingReviewStamps,
  ReviewStamps,
} from "./onboarding-review-stamps";
import type { OnboardingReviews } from "./onboarding-reviews";
import type { OnboardingSubmission } from "./onboarding-submission";

const SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const OPENED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T10:00:00.000Z");
const NOW = new Date("2026-09-30T10:00:00.000Z");
const WEIGHT = { formId: "goal-availability", fieldId: "weight" } as const;

const REQUESTED_STAMPS: ReviewStamps = {
  reviewOpenedAt: OPENED_AT,
  detailsRequestedAt: ASKED_AT,
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
  reviewStamps: REQUESTED_STAMPS,
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

function askedRequest(): DetailRequest {
  return DetailRequest.raise({
    id: "request-1",
    clientId: CLIENT.clientId,
    questionIds: [WEIGHT],
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
  } satisfies OnboardingReviews;
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

function answerPorts(
  overrides: {
    client?: OnboardingClient | null;
    requests?: DetailRequest[];
    stamps?: OnboardingReviewStamps;
    measurements?: MeasurementEntry[];
  } = {},
) {
  return {
    clients: {
      findByAuthSubjectId: vi
        .fn()
        .mockResolvedValue(
          overrides.client === undefined ? CLIENT : overrides.client,
        ),
      findByClientId: vi.fn().mockResolvedValue(null),
    } satisfies OnboardingClients,
    onboardings: {
      findByClientId: vi
        .fn()
        .mockResolvedValue({ draft: null, submission: SUBMISSION }),
    } satisfies ClientOnboardingSource,
    reviews: createReviews(overrides.requests ?? [askedRequest()]),
    measurements: {
      listByClientId: vi.fn().mockResolvedValue(overrides.measurements ?? []),
    } satisfies ClientMeasurementsSource,
    unitPreferences: {
      findByClientId: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
    } satisfies ClientUnitPreferences,
    stamps:
      overrides.stamps ??
      ({
        record: vi.fn().mockResolvedValue(undefined),
      } satisfies OnboardingReviewStamps),
    clock: { now: () => NOW },
    incidents: createIncidents(),
  };
}

describe("AnswerOnboardingDetailsUseCase", () => {
  it("records her asked answers and the answered request, then stamps her back to in-review", async () => {
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
      profile: expect.any(ClientProfile),
    });
    expect(ports.stamps.record).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      stamps: { ...REQUESTED_STAMPS, detailsAnsweredAt: NOW },
    });
    expect(ports.incidents.onboardingDetailsAnswered).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      questionCount: 1,
    });
  });

  it("rebuilds her profile from her answers with the new ones merged in and her latest measurement", async () => {
    // arrange
    const ports = answerPorts({
      measurements: [
        { recordedAt: SUBMITTED_AT, weightKg: 70, waistCm: 74 },
        { recordedAt: ASKED_AT, weightKg: 69.2, waistCm: 73 },
        { recordedAt: OPENED_AT, weightKg: 69.8, waistCm: 73.5 },
      ],
    });
    const useCase = new AnswerOnboardingDetailsUseCase(ports);

    // act
    await useCase.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72 } },
    });

    // assert
    const [recorded] = ports.reviews.recordAnswer.mock.calls[0];
    expect(recorded.profile.toSnapshot()).toEqual({
      clientId: CLIENT.clientId,
      firstName: "Ana",
      lastName: "Popescu",
      email: "ana@example.com",
      dateOfBirth: "1994-03-14",
      gender: "female",
      country: "RO",
      phone: "+40712345678",
      heightCm: 168,
      startingWeightKg: 72,
      currentWeightKg: 69.2,
      activityLevel: null,
      primaryGoal: null,
      dietaryRestrictions: "None",
      clientNotes: null,
      updatedAt: NOW,
    });
    expect(ports.measurements.listByClientId).toHaveBeenCalledWith(
      CLIENT.clientId,
    );
  });

  it("records the answer before the stamp and re-applies the stamp when the first write failed", async () => {
    // arrange
    const failingStamps = {
      record: vi.fn().mockRejectedValue(new Error("clients update failed")),
    } satisfies OnboardingReviewStamps;
    const firstPorts = answerPorts({ stamps: failingStamps });
    const firstAttempt = new AnswerOnboardingDetailsUseCase(firstPorts);
    const retryPorts = answerPorts({
      requests: [askedRequest().answer(NOW)],
    });
    const retry = new AnswerOnboardingDetailsUseCase(retryPorts);

    // act
    const firstOutcome = firstAttempt.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72 } },
    });
    await expect(firstOutcome).rejects.toThrow("clients update failed");
    const retryResult = await retry.execute({
      authSubjectId: "user_ana",
      answers: { "goal-availability": { weight: 72 } },
    });

    // assert
    expect(
      firstPorts.reviews.recordAnswer.mock.invocationCallOrder[0],
    ).toBeLessThan(failingStamps.record.mock.invocationCallOrder[0]);
    expect(retryResult).toEqual({ status: "no-open-request" });
    expect(retryPorts.reviews.recordAnswer).not.toHaveBeenCalled();
    expect(retryPorts.stamps.record).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      stamps: { ...REQUESTED_STAMPS, detailsAnsweredAt: NOW },
    });
    expect(
      retryPorts.incidents.onboardingReviewStampsRepaired,
    ).toHaveBeenCalledWith({ clientId: CLIENT.clientId });
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
    expect(ports.stamps.record).not.toHaveBeenCalled();
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
});
