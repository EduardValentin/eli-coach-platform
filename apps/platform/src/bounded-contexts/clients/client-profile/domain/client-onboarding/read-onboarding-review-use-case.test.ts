import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import type {
  ClientMeasurementsSourcePort,
  MeasurementEntry,
} from "../measurement";

import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { DetailRequest } from "./detail-request";
import {
  emptyAnswers,
  type OnboardingAnswersByForm,
} from "./onboarding-answers";
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
import { ReadOnboardingReviewUseCase } from "./read-onboarding-review-use-case";

const SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const OPENED_AT = new Date("2026-09-28T09:00:00.000Z");
const ASKED_AT = new Date("2026-09-28T10:00:00.000Z");
const WEIGHT = { formId: "goal-availability", fieldId: "weight" } as const;

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

const SUBMITTED_MEASUREMENT: MeasurementEntry = {
  recordedAt: SUBMITTED_AT,
  weightKg: 70,
  waistCm: 74,
};

const MEASUREMENTS: MeasurementEntry[] = [
  {
    recordedAt: new Date("2026-10-04T10:00:00.000Z"),
    weightKg: 68.5,
    waistCm: 71,
  },
  SUBMITTED_MEASUREMENT,
];

function answers(): OnboardingAnswersByForm {
  return {
    ...emptyAnswers(),
    "goal-availability": { weight: 70, height: 168, primaryGoal: "Lose fat" },
    "safety-screening": {
      heartCondition: "Yes",
      chestPainOnExertion: "No",
      dizzinessOrFainting: "No",
      chronicConditionDiagnosed: "Yes",
      chronicConditionDiagnosedList: "Asthma",
      chronicConditionMedication: "No",
      boneOrJointProblem: "Yes",
      boneOrJointProblemList: "Knee",
      doctorProhibitedActivity: "No",
      parqDeclaration: true,
    },
    "cycle-context": {
      cycleRegularity: "No, or very rarely",
      hormonalContraception: "Combined pill",
      lifeStage: ["Pregnant"],
      recurringSymptoms: ["Migraines"],
    },
  };
}

function submission(
  submitted: OnboardingAnswersByForm = answers(),
): OnboardingSubmission {
  return {
    answers: submitted,
    consents: {
      specialCategoryAt: SUBMITTED_AT,
      disclaimerAt: SUBMITTED_AT,
      progressPhotosAt: null,
    },
    submittedAt: SUBMITTED_AT,
  };
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

function readPorts(
  overrides: {
    client?: OnboardingClient | null;
    identity?: ClientIdentity;
    submission?: OnboardingSubmission | null;
    stored?: Partial<
      Awaited<ReturnType<OnboardingReviewsPort["findByClientId"]>>
    >;
  } = {},
) {
  return {
    participants: new OnboardingParticipants({
      onboardingClientsPort: {
        findByAuthSubjectId: vi.fn().mockResolvedValue(null),
        findByClientId: vi
          .fn()
          .mockResolvedValue(
            overrides.client === undefined ? CLIENT : overrides.client,
          ),
      } satisfies OnboardingClientsPort,
      clientIdentitiesPort: {
        findByClientId: vi
          .fn()
          .mockResolvedValue(overrides.identity ?? IDENTITY),
      } satisfies Pick<ClientIdentitiesPort, "findByClientId">,
    }),
    clientOnboardingSourcePort: {
      findByClientId: vi.fn().mockResolvedValue({
        draft: null,
        submission:
          overrides.submission === undefined
            ? submission()
            : overrides.submission,
      }),
    } satisfies ClientOnboardingSourcePort,
    onboardingReviewsPort: {
      findByClientId: vi.fn().mockResolvedValue({
        openedAt: null,
        approvedAt: null,
        requests: [],
        ...overrides.stored,
      }),
      recordOpened: vi.fn(),
      recordRequest: vi.fn(),
      recordAnswer: vi.fn(),
      recordApproval: vi.fn(),
    } satisfies OnboardingReviewsPort,
    clientMeasurementsSourcePort: {
      listByClientId: vi.fn().mockResolvedValue(MEASUREMENTS),
    } satisfies ClientMeasurementsSourcePort,
    onboardingReviewStampsPort: {
      record: vi.fn().mockResolvedValue(undefined),
    } satisfies OnboardingReviewStampsPort,
    clientOnboardingIncidentsPort: createIncidents(),
  };
}

describe("ReadOnboardingReviewUseCase", () => {
  it("reads her submitted answers with the safety and cycle signals derived", async () => {
    // arrange
    const ports = readPorts();
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result.status).toBe("submitted");
    if (result.status !== "submitted") return;
    expect(result.stage).toBe("awaiting-review");
    expect(result.submission).toEqual(submission());
    expect(result.screening).toEqual({ outcome: "needs-review", yesCount: 3 });
    expect(result.withholdsNutritionAdvice).toBe(true);
    expect(result.pregnancyContext).toBe(true);
    expect(result.flaggedQuestions).toEqual([
      { formId: "safety-screening", fieldId: "heartCondition" },
      { formId: "safety-screening", fieldId: "chronicConditionDiagnosed" },
      { formId: "safety-screening", fieldId: "boneOrJointProblem" },
      { formId: "cycle-context", fieldId: "lifeStage" },
      { formId: "cycle-context", fieldId: "recurringSymptoms" },
    ]);
    expect(result.openRequest).toBeNull();
    expect(result.requests).toEqual([]);
    expect(result.submittedMeasurement).toEqual(SUBMITTED_MEASUREMENT);
    expect(result.statedHeightCm).toBe(168);
    expect(
      ports.clientMeasurementsSourcePort.listByClientId,
    ).toHaveBeenCalledWith(CLIENT.clientId);
  });

  it("reads no submitted measurement while none is recorded for her", async () => {
    // arrange
    const ports = readPorts();
    ports.clientMeasurementsSourcePort.listByClientId.mockResolvedValue([]);
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    if (result.status !== "submitted") throw new Error(result.status);
    expect(result.submittedMeasurement).toBeNull();
  });

  it("lists only the forms and questions her answers made reachable, with answered and total counts", async () => {
    // arrange
    const ports = readPorts();
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    if (result.status !== "submitted") throw new Error(result.status);
    const safety = result.forms.find(
      (form) => form.formId === "safety-screening",
    );
    expect(result.forms.map((form) => form.formId)).toEqual([
      "goal-availability",
      "safety-screening",
      "cycle-context",
      "nutrition-lifestyle",
      "measurements",
    ]);
    expect(safety?.fieldIds).toContain("chronicConditionDiagnosedList");
    expect(safety?.fieldIds).not.toContain("chronicConditionMedicationList");
    expect(safety).toMatchObject({
      answered: 10,
      total: safety?.fieldIds.length,
    });
  });

  it("reads no cycle form for a male client", async () => {
    // arrange
    const ports = readPorts({ identity: { ...IDENTITY, gender: "male" } });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    if (result.status !== "submitted") throw new Error(result.status);
    expect(result.forms.map((form) => form.formId)).not.toContain(
      "cycle-context",
    );
  });

  it("reads no pregnancy context from an unanswered cycle form", async () => {
    // arrange
    const submitted = { ...answers(), "cycle-context": {} };
    const ports = readPorts({ submission: submission(submitted) });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    if (result.status !== "submitted") throw new Error(result.status);
    expect(result.pregnancyContext).toBe(false);
  });

  it("reads the open request the coach is waiting on", async () => {
    // arrange
    const request = DetailRequest.raise({
      id: "request-1",
      clientId: CLIENT.clientId,
      questionIds: [WEIGHT],
      note: "Please weigh yourself in the morning.",
      askedAt: ASKED_AT,
    });
    const ports = readPorts({
      client: {
        ...CLIENT,
        reviewStamps: {
          ...NO_STAMPS,
          reviewOpenedAt: OPENED_AT,
          detailsRequestedAt: ASKED_AT,
        },
      },
      stored: { openedAt: OPENED_AT, requests: [request] },
    });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    if (result.status !== "submitted") throw new Error(result.status);
    expect(result.stage).toBe("needs-details");
    expect(result.openRequest).toEqual(request.toSnapshot());
    expect(result.requests).toEqual([request.toSnapshot()]);
    expect(ports.onboardingReviewStampsPort.record).not.toHaveBeenCalled();
  });

  it("repairs lagging stamps on the coach's read", async () => {
    // arrange
    const ports = readPorts({ stored: { openedAt: OPENED_AT } });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toMatchObject({ status: "submitted", stage: "in-review" });
    expect(ports.onboardingReviewStampsPort.record).toHaveBeenCalledWith({
      clientId: CLIENT.clientId,
      stamps: { ...NO_STAMPS, reviewOpenedAt: OPENED_AT },
    });
    expect(
      ports.clientOnboardingIncidentsPort.onboardingReviewStampsRepaired,
    ).toHaveBeenCalledWith({ clientId: CLIENT.clientId });
  });

  it("reads only that her answers are not in before she submits", async () => {
    // arrange
    const ports = readPorts({ submission: null });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute(CLIENT.clientId);

    // assert
    expect(result).toEqual({ status: "not-submitted" });
    expect(
      ports.clientMeasurementsSourcePort.listByClientId,
    ).not.toHaveBeenCalled();
  });

  it("answers not-found for an unknown client", async () => {
    // arrange
    const ports = readPorts({ client: null });
    const readOnboardingReviewUseCase = new ReadOnboardingReviewUseCase(ports);

    // act
    const result = await readOnboardingReviewUseCase.execute("client-9");

    // assert
    expect(result).toEqual({ status: "not-found" });
  });
});
