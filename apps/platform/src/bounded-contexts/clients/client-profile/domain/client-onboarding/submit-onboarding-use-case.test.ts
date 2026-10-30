import { describe, expect, it, vi } from "vitest";

import { CoachingStanding } from "~/bounded-contexts/clients/clients/domain/client";
import type {
  ClientIdentitiesPort,
  ClientIdentity,
} from "../client-identities-port";
import {
  ClientSettings,
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";

import type { ClientOnboardingChangesPort } from "./client-onboarding-changes-port";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import {
  emptyAnswers,
  type OnboardingAnswersByForm,
} from "./onboarding-answers";
import type {
  OnboardingClient,
  OnboardingClientsPort,
} from "./onboarding-clients-port";
import type { OnboardingConsents } from "./onboarding-consents";
import { OnboardingParticipants } from "./onboarding-participants";
import type { OnboardingSubmissionStampsPort } from "./onboarding-submission-stamps-port";
import type { OnboardingSubmission } from "./onboarding-submission";
import { SubmitOnboardingUseCase } from "./submit-onboarding-use-case";

const NOW = new Date("2026-09-28T10:00:00.000Z");
const EARLIER_SUBMITTED_AT = new Date("2026-09-27T10:00:00.000Z");
const CONSENTED_AT = new Date("2026-09-28T09:30:00.000Z");
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
const IDENTITY: ClientIdentity = {
  clientId: "client-1",
  gender: "male",
  dateOfBirth: "1990-03-02",
  firstName: "Ana",
  lastName: "Popescu",
  country: "RO",
  phone: "+40712345678",
  email: "ana@example.com",
};
const IMPERIAL = UnitPreference.of("imperial");

function completeAnswers(): OnboardingAnswersByForm {
  return {
    ...emptyAnswers(),
    "goal-availability": {
      weight: 82.5,
      height: 180,
      goalWeight: 78,
      primaryGoal: "Build muscle",
      blockers: ["Busy schedule"],
      experienceLevel: "New to training",
      trainingDaysPerWeek: "3 days",
      minutesPerSession: "45–60 minutes",
      previousPt: "No",
      coachExpectations: "Keep me on track.",
      lifestyleActivityLevel: "Mostly sitting",
      availableEquipment: ["Full gym"],
      trainingPlace: "Gym",
    },
    "safety-screening": {
      heartCondition: "No",
      chestPainOnExertion: "No",
      dizzinessOrFainting: "No",
      chronicConditionDiagnosed: "No",
      chronicConditionMedication: "No",
      boneOrJointProblem: "No",
      doctorProhibitedActivity: "No",
      parqDeclaration: true,
    },
    "nutrition-lifestyle": {
      eatingStyle: "No restrictions",
      allergiesOrIntolerances: "No",
      mealsPerDay: "Three",
      snacksPerDay: "One",
      firstMeal: "7–9am",
      lastMeal: "6–8pm",
      energyDips: "No",
      jobType: "Mostly sitting",
      sleepHours: "7–8 hours",
      eatingOutFrequency: "A mix of both",
      cookingSetup: "I do",
      cookingTime: "15–30 minutes",
      waterPerDay: "5–8 glasses",
      nutritionGoal: "Eat more protein.",
      checkInDay: "Sunday",
      checkInChannel: "WhatsApp",
    },
    measurements: { waist: 88 },
  };
}

function givenConsents(): OnboardingConsents {
  return {
    specialCategoryAt: CONSENTED_AT,
    disclaimerAt: CONSENTED_AT,
    progressPhotosAt: null,
  };
}

function answersWithWeight(weight: number): OnboardingAnswersByForm {
  const answers = completeAnswers();
  answers["goal-availability"] = { ...answers["goal-availability"], weight };

  return answers;
}

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

function createIdentities(found: ClientIdentity | null = IDENTITY) {
  return {
    findByClientId: vi.fn().mockResolvedValue(found),
  } satisfies Pick<ClientIdentitiesPort, "findByClientId">;
}

function createOnboardings(submission: OnboardingSubmission | null = null) {
  return {
    findByClientId: vi.fn().mockResolvedValue({ draft: null, submission }),
  } satisfies ClientOnboardingSourcePort;
}

function settingsWith(
  preference: UnitPreference | null,
): ClientSettings | null {
  return (
    preference &&
    ClientSettings.reconstitute({
      clientId: "client-1",
      unitPreference: preference.toSnapshot(),
      preferredCheckInWeekday: null,
      preferredChannel: null,
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    })
  );
}

function createSettings(preference: UnitPreference | null = null) {
  return {
    findByClientId: vi.fn().mockResolvedValue(settingsWith(preference)),
  } satisfies ClientSettingsSourcePort;
}

function createChanges(
  recorded: Awaited<
    ReturnType<ClientOnboardingChangesPort["recordSubmission"]>
  > = {
    status: "recorded",
  },
) {
  return {
    saveDraft: vi.fn().mockResolvedValue("saved"),
    recordSubmission: vi.fn().mockResolvedValue(recorded),
  } satisfies ClientOnboardingChangesPort;
}

function createStamps() {
  return {
    recordOnboardingSubmitted: vi.fn().mockResolvedValue(undefined),
  } satisfies OnboardingSubmissionStampsPort;
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
    clientSettingsSourcePort?: ClientSettingsSourcePort;
    clientOnboardingChangesPort?: ClientOnboardingChangesPort;
    onboardingSubmissionStampsPort?: OnboardingSubmissionStampsPort;
    clientOnboardingIncidentsPort?: ClientOnboardingIncidentsPort;
  } = {},
) {
  return new SubmitOnboardingUseCase({
    participants: new OnboardingParticipants({
      onboardingClientsPort:
        ports.onboardingClientsPort ?? createClients(CLIENT),
      clientIdentitiesPort: ports.clientIdentitiesPort ?? createIdentities(),
    }),
    clientOnboardingSourcePort:
      ports.clientOnboardingSourcePort ?? createOnboardings(),
    clientSettingsSourcePort:
      ports.clientSettingsSourcePort ?? createSettings(),
    clientOnboardingChangesPort:
      ports.clientOnboardingChangesPort ?? createChanges(),
    measurementIdsPort: { generate: () => "entry-1" },
    onboardingSubmissionStampsPort:
      ports.onboardingSubmissionStampsPort ?? createStamps(),
    clockPort: { now: () => NOW },
    clientOnboardingIncidentsPort:
      ports.clientOnboardingIncidentsPort ?? createIncidents(),
  });
}

describe("SubmitOnboardingUseCase", () => {
  it("records her submission with her first measurements under a fresh entry id, then stamps her journey", async () => {
    // arrange
    const changes = createChanges();
    const stamps = createStamps();
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      clientOnboardingChangesPort: changes,
      onboardingSubmissionStampsPort: stamps,
      clientOnboardingIncidentsPort: incidents,
    });
    const consents = givenConsents();

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents,
    });

    // assert
    expect(result).toEqual({
      status: "submitted",
      submittedAt: NOW,
      clientId: "client-1",
      entryId: "entry-1",
    });
    expect(changes.recordSubmission).toHaveBeenCalledWith({
      clientId: "client-1",
      submission: { answers: completeAnswers(), consents, submittedAt: NOW },
      entryId: "entry-1",
      measurementEntry: { recordedAt: NOW, weightKg: 82.5, waistCm: 88 },
    });
    expect(stamps.recordOnboardingSubmitted).toHaveBeenCalledWith({
      clientId: "client-1",
      at: NOW,
    });
    expect(changes.recordSubmission.mock.invocationCallOrder[0]).toBeLessThan(
      stamps.recordOnboardingSubmitted.mock.invocationCallOrder[0],
    );
    expect(incidents.onboardingSubmissionAccepted).toHaveBeenCalledWith({
      clientId: "client-1",
      screeningOutcome: "cleared",
    });
  });

  it("reports the manual screening outcome for a client screened by hand", async () => {
    // arrange
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      clientIdentitiesPort: createIdentities({
        ...IDENTITY,
        dateOfBirth: "2012-01-01",
      }),
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(incidents.onboardingSubmissionAccepted).toHaveBeenCalledWith({
      clientId: "client-1",
      screeningOutcome: "manual",
    });
  });

  it.each([
    ["the units she chose", IMPERIAL, "Enter a weight between 66 and 661 lb."],
    [
      "metric units while she has chosen none",
      null,
      "Enter a weight between 30 and 300 kg.",
    ],
  ] as const)(
    "names the problems in %s",
    async (_label, preference, message) => {
      // arrange
      const changes = createChanges();
      const stamps = createStamps();
      const incidents = createIncidents();
      const submitOnboardingUseCase = createUseCase({
        clientSettingsSourcePort: createSettings(preference),
        clientOnboardingChangesPort: changes,
        onboardingSubmissionStampsPort: stamps,
        clientOnboardingIncidentsPort: incidents,
      });

      // act
      const result = await submitOnboardingUseCase.execute({
        authSubjectId: "user_radu",
        answers: answersWithWeight(20),
        consents: givenConsents(),
      });

      // assert
      expect(result).toEqual({
        status: "invalid",
        problems: [{ formId: "goal-availability", fieldId: "weight", message }],
      });
      expect(changes.recordSubmission).not.toHaveBeenCalled();
      expect(stamps.recordOnboardingSubmitted).not.toHaveBeenCalled();
      expect(incidents.onboardingSubmissionRefused).toHaveBeenCalledWith({
        clientId: "client-1",
        reason: "invalid",
      });
    },
  );

  it("asks for the missing consent", async () => {
    // arrange
    const changes = createChanges();
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      clientOnboardingChangesPort: changes,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents: { ...givenConsents(), disclaimerAt: null },
    });

    // assert
    expect(result).toEqual({
      status: "consent-missing",
      consent: "disclaimer",
    });
    expect(changes.recordSubmission).not.toHaveBeenCalled();
    expect(incidents.onboardingSubmissionRefused).toHaveBeenCalledWith({
      clientId: "client-1",
      reason: "consent-missing",
    });
  });

  it("stamps her journey again at her earlier submission when she has already sent it", async () => {
    // arrange
    const changes = createChanges();
    const stamps = createStamps();
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      clientOnboardingSourcePort: createOnboardings({
        answers: completeAnswers(),
        consents: givenConsents(),
        submittedAt: EARLIER_SUBMITTED_AT,
      }),
      clientOnboardingChangesPort: changes,
      onboardingSubmissionStampsPort: stamps,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(changes.recordSubmission).not.toHaveBeenCalled();
    expect(stamps.recordOnboardingSubmitted).toHaveBeenCalledWith({
      clientId: "client-1",
      at: EARLIER_SUBMITTED_AT,
    });
    expect(incidents.onboardingSubmissionRefused).toHaveBeenCalledWith({
      clientId: "client-1",
      reason: "already-submitted",
    });
  });

  it("stamps her journey now when her submission was recorded meanwhile", async () => {
    // arrange
    const stamps = createStamps();
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      clientOnboardingChangesPort: createChanges({
        status: "already-submitted",
      }),
      onboardingSubmissionStampsPort: stamps,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(stamps.recordOnboardingSubmitted).toHaveBeenCalledWith({
      clientId: "client-1",
      at: NOW,
    });
    expect(incidents.onboardingSubmissionAccepted).not.toHaveBeenCalled();
    expect(incidents.onboardingSubmissionRefused).toHaveBeenCalledWith({
      clientId: "client-1",
      reason: "already-submitted",
    });
  });

  it("stamps her journey at her concurrent submission's time, not now, when it was recorded meanwhile", async () => {
    // arrange
    const stamps = createStamps();
    const incidents = createIncidents();
    const concurrentSubmittedAt = new Date("2026-09-28T09:55:00.000Z");
    const clientOnboardingSourcePort: ClientOnboardingSourcePort = {
      findByClientId: vi
        .fn()
        .mockResolvedValueOnce({ draft: null, submission: null })
        .mockResolvedValueOnce({
          draft: null,
          submission: {
            answers: completeAnswers(),
            consents: givenConsents(),
            submittedAt: concurrentSubmittedAt,
          },
        }),
    };
    const submitOnboardingUseCase = createUseCase({
      clientOnboardingSourcePort,
      clientOnboardingChangesPort: createChanges({
        status: "already-submitted",
      }),
      onboardingSubmissionStampsPort: stamps,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_radu",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toEqual({ status: "already-submitted" });
    expect(clientOnboardingSourcePort.findByClientId).toHaveBeenCalledTimes(2);
    expect(stamps.recordOnboardingSubmitted).toHaveBeenCalledWith({
      clientId: "client-1",
      at: concurrentSubmittedAt,
    });
  });

  it("submits nothing for a subject bound to no client", async () => {
    // arrange
    const onboardings = createOnboardings();
    const changes = createChanges();
    const stamps = createStamps();
    const incidents = createIncidents();
    const submitOnboardingUseCase = createUseCase({
      onboardingClientsPort: createClients(null),
      clientOnboardingSourcePort: onboardings,
      clientOnboardingChangesPort: changes,
      onboardingSubmissionStampsPort: stamps,
      clientOnboardingIncidentsPort: incidents,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_stranger",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toEqual({ status: "not-on-journey" });
    expect(onboardings.findByClientId).not.toHaveBeenCalled();
    expect(changes.recordSubmission).not.toHaveBeenCalled();
    expect(stamps.recordOnboardingSubmitted).not.toHaveBeenCalled();
    expect(incidents.onboardingSubmissionRefused).not.toHaveBeenCalled();
  });

  it("submits nothing for a client whose portal access has ended", async () => {
    // arrange
    const changes = createChanges();
    const stamps = createStamps();
    const submitOnboardingUseCase = createUseCase({
      onboardingClientsPort: createClients(
        clientWithAccessEndingAt(ENDED_ACCESS_AT),
      ),
      clientOnboardingChangesPort: changes,
      onboardingSubmissionStampsPort: stamps,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_ana",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toEqual({ status: "ended" });
    expect(changes.recordSubmission).not.toHaveBeenCalled();
    expect(stamps.recordOnboardingSubmitted).not.toHaveBeenCalled();
  });

  it("submits the answers of a client who cancelled while her access runs on", async () => {
    // arrange
    const changes = createChanges();
    const submitOnboardingUseCase = createUseCase({
      onboardingClientsPort: createClients(
        clientWithAccessEndingAt(RUNNING_ACCESS_ENDS_AT),
      ),
      clientOnboardingChangesPort: changes,
    });

    // act
    const result = await submitOnboardingUseCase.execute({
      authSubjectId: "user_ana",
      answers: completeAnswers(),
      consents: givenConsents(),
    });

    // assert
    expect(result).toMatchObject({ status: "submitted" });
    expect(changes.recordSubmission).toHaveBeenCalled();
  });
});
