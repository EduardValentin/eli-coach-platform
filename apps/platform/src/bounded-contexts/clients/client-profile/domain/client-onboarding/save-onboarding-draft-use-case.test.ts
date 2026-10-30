import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";

import type { ClientOnboardingChangesPort } from "./client-onboarding-changes-port";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import { emptyAnswers } from "./onboarding-answers";
import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";
import { noConsents } from "./onboarding-consents";
import { OnboardingParticipants } from "./onboarding-participants";
import type { OnboardingSubmission } from "./onboarding-submission";
import { SaveOnboardingDraftUseCase } from "./save-onboarding-draft-use-case";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const CLIENT: OnboardingClient = {
  clientId: "client-1",
  submittedAt: null,
  reviewStamps: {
    reviewOpenedAt: null,
    detailsRequestedAt: null,
    detailsAnsweredAt: null,
    answersApprovedAt: null,
  },
  standing: CoachingStanding.of({
    status: "not-started",
    accessEndsAt: null,
    refundDue: false,
    bundleMonths: null,
    programStartsAt: null,
    paidThrough: null,
  }),
};
const MALE_IDENTITY: ClientIdentity = {
  clientId: "client-1",
  gender: "male",
  dateOfBirth: "1990-03-02",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
};
const SUBMISSION: OnboardingSubmission = {
  answers: emptyAnswers(),
  consents: noConsents(),
  submittedAt: new Date("2026-09-27T10:00:00.000Z"),
};

const ENDED_ACCESS_AT = new Date("2026-09-27T10:00:00.000Z");
const RUNNING_ACCESS_ENDS_AT = new Date("2026-10-28T10:00:00.000Z");

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

function createClients(found: OnboardingClient | null) {
  return {
    findByAuthSubjectId: vi.fn().mockResolvedValue(found),
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies OnboardingClientsPort;
}

function createIdentities(found: ClientIdentity | null = MALE_IDENTITY) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientIdentitiesPort, "findByClientId">;
}

function createOnboardings(submission: OnboardingSubmission | null = null) {
  return {
    findByClientId: vi.fn().mockResolvedValue({ draft: null, submission }),
  } satisfies ClientOnboardingSourcePort;
}

function createChanges(
  saved: Awaited<
    ReturnType<ClientOnboardingChangesPort["saveDraft"]>
  > = "saved",
) {
  return {
    saveDraft: vi.fn().mockResolvedValue(saved),
    recordSubmission: vi
      .fn()
      .mockResolvedValue({ status: "recorded", entryId: "entry-1" }),
  } satisfies ClientOnboardingChangesPort;
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

function createUseCase(
  ports: {
    onboardingClientsPort?: OnboardingClientsPort;
    clientIdentitiesPort?: Pick<ClientIdentitiesPort, "findByClientId">;
    clientOnboardingSourcePort?: ClientOnboardingSourcePort;
    clientOnboardingChangesPort?: ClientOnboardingChangesPort;
    clientOnboardingIncidentsPort?: ClientOnboardingIncidentsPort;
  } = {},
) {
  return new SaveOnboardingDraftUseCase({
    participants: new OnboardingParticipants({
      onboardingClientsPort:
        ports.onboardingClientsPort ?? createClients(CLIENT),
      clientIdentitiesPort: ports.clientIdentitiesPort ?? createIdentities(),
    }),
    clientOnboardingSourcePort:
      ports.clientOnboardingSourcePort ?? createOnboardings(),
    clientOnboardingChangesPort:
      ports.clientOnboardingChangesPort ?? createChanges(),
    clockPort: { now: () => NOW },
    clientOnboardingIncidentsPort:
      ports.clientOnboardingIncidentsPort ?? createIncidents(),
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
    const saveOnboardingDraftUseCase = createUseCase({
      clientOnboardingChangesPort: changes,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

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
    const saveOnboardingDraftUseCase = createUseCase({
      onboardingClientsPort: createClients(null),
      clientOnboardingChangesPort: changes,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(changes.saveDraft).not.toHaveBeenCalled();
  });

  it("saves nothing once she has sent her onboarding", async () => {
    // arrange
    const changes = createChanges();
    const saveOnboardingDraftUseCase = createUseCase({
      clientOnboardingSourcePort: createOnboardings(SUBMISSION),
      clientOnboardingChangesPort: changes,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(changes.saveDraft).not.toHaveBeenCalled();
  });

  it("answers already submitted when her submission lands before the draft", async () => {
    // arrange
    const incidents = createIncidents();
    const saveOnboardingDraftUseCase = createUseCase({
      clientOnboardingChangesPort: createChanges("already-submitted"),
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

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
    const saveOnboardingDraftUseCase = createUseCase({
      clientOnboardingChangesPort: changes,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const saving = saveOnboardingDraftUseCase.execute(command());

    // assert
    await expect(saving).rejects.toBe(failure);
    expect(incidents.onboardingDraftSaveFailed).toHaveBeenCalledWith({
      clientId: "client-1",
      formId: "goal-availability",
    });
    expect(incidents.onboardingDraftSaved).not.toHaveBeenCalled();
  });

  it("saves nothing for a client whose portal access has ended", async () => {
    // arrange
    const changes = createChanges();
    const saveOnboardingDraftUseCase = createUseCase({
      onboardingClientsPort: createClients(
        clientWithAccessEndingAt(ENDED_ACCESS_AT),
      ),
      clientOnboardingChangesPort: changes,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(changes.saveDraft).not.toHaveBeenCalled();
  });

  it("saves the draft of a client who cancelled while her access runs on", async () => {
    // arrange
    const changes = createChanges();
    const saveOnboardingDraftUseCase = createUseCase({
      onboardingClientsPort: createClients(
        clientWithAccessEndingAt(RUNNING_ACCESS_ENDS_AT),
      ),
      clientOnboardingChangesPort: changes,
    });

    // act
    const result = await saveOnboardingDraftUseCase.execute(command());

    // assert
    expect(result).toEqual({ status: "saved" });
    expect(changes.saveDraft).toHaveBeenCalled();
  });
});
