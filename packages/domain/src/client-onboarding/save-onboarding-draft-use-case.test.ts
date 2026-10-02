import { describe, expect, it, vi } from "vitest";

import type { ClientOnboardingChanges } from "./client-onboarding-changes";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import { emptyAnswers } from "./onboarding-answers";
import type { OnboardingClient, OnboardingClients } from "./onboarding-clients";
import { noConsents } from "./onboarding-consents";
import type { OnboardingSubmission } from "./onboarding-submission";
import { SaveOnboardingDraftUseCase } from "./save-onboarding-draft-use-case";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const MALE_CLIENT: OnboardingClient = {
  clientId: "client-1",
  gender: "male",
  dateOfBirth: "1990-03-02",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
  submittedAt: null,
  reviewStamps: {
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
};
const SUBMISSION: OnboardingSubmission = {
  answers: emptyAnswers(),
  consents: noConsents(),
  submittedAt: new Date("2026-09-27T10:00:00.000Z"),
};

function createClients(found: OnboardingClient | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClients;
}

function createOnboardings(submission: OnboardingSubmission | null = null) {
  return {
    findByClientId: vi.fn().mockResolvedValue({ draft: null, submission }),
  } satisfies ClientOnboardingSource;
}

function createChanges(
  saved: Awaited<ReturnType<ClientOnboardingChanges["saveDraft"]>> = "saved",
) {
  return {
    saveDraft: vi.fn().mockResolvedValue(saved),
    recordSubmission: vi
      .fn()
      .mockResolvedValue({ status: "recorded", entryId: "entry-1" }),
  } satisfies ClientOnboardingChanges;
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

function createUseCase(
  ports: {
    clients?: OnboardingClients;
    onboardings?: ClientOnboardingSource;
    changes?: ClientOnboardingChanges;
    incidents?: ClientOnboardingIncidents;
  } = {},
) {
  return new SaveOnboardingDraftUseCase({
    clients: ports.clients ?? createClients(MALE_CLIENT),
    onboardings: ports.onboardings ?? createOnboardings(),
    changes: ports.changes ?? createChanges(),
    clock: { now: () => NOW },
    incidents: ports.incidents ?? createIncidents(),
  });
}

function command() {
  const answers = emptyAnswers();
  answers["goal-availability"] = {
    weight: 80,
    previousPt: "No",
    previousPtExperience: "Great sessions, poor follow-up.",
  };
  answers["cycle-context"] = { cycleRegularity: "No, or very rarely" };

  return {
    authSubjectId: "user_radu",
    formId: "goal-availability" as const,
    answers,
    currentFormIndex: 7,
    consents: noConsents(),
  };
}

describe("SaveOnboardingDraftUseCase", () => {
  it("replaces her draft with the answers she can be asked, dated now", async () => {
    // arrange
    const changes = createChanges();
    const incidents = createIncidents();
    const useCase = createUseCase({ changes, incidents });

    // act
    const result = await useCase.execute(command());

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(changes.saveDraft).toHaveBeenCalledWith({
      clientId: "client-1",
      draft: {
        answers: {
          ...emptyAnswers(),
          "goal-availability": { weight: 80, previousPt: "No" },
        },
        currentFormIndex: 3,
        consents: noConsents(),
        updatedAt: NOW,
      },
    });
    expect(incidents.onboardingDraftSaved).toHaveBeenCalledWith({
      clientId: "client-1",
      formId: "goal-availability",
    });
  });

  it("saves nothing for a subject bound to no client", async () => {
    // arrange
    const changes = createChanges();
    const useCase = createUseCase({ clients: createClients(null), changes });

    // act
    const result = await useCase.execute(command());

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(changes.saveDraft).not.toHaveBeenCalled();
  });

  it("saves nothing once she has sent her onboarding", async () => {
    // arrange
    const changes = createChanges();
    const useCase = createUseCase({
      onboardings: createOnboardings(SUBMISSION),
      changes,
    });

    // act
    const result = await useCase.execute(command());

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(changes.saveDraft).not.toHaveBeenCalled();
  });

  it("answers already submitted when her submission lands before the draft", async () => {
    // arrange
    const incidents = createIncidents();
    const useCase = createUseCase({
      changes: createChanges("already-submitted"),
      incidents,
    });

    // act
    const result = await useCase.execute(command());

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(incidents.onboardingDraftSaved).not.toHaveBeenCalled();
  });

  it("reports a failed save and lets the failure through", async () => {
    // arrange
    const failure = new Error("connection reset");
    const changes = createChanges();
    changes.saveDraft.mockRejectedValue(failure);
    const incidents = createIncidents();
    const useCase = createUseCase({ changes, incidents });

    // act
    const saving = useCase.execute(command());

    // assert
    await expect(saving).rejects.toBe(failure);
    expect(incidents.onboardingDraftSaveFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      formId: "goal-availability",
    });
    expect(incidents.onboardingDraftSaved).not.toHaveBeenCalled();
  });
});
