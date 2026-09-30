import { ClientProfile } from "../client-profile";
import type { Clock } from "../shared";
import {
  measureUnitsOf,
  UnitPreference,
  type ClientUnitPreferencesSource,
} from "../unit-preference";

import {
  ClientOnboarding,
  type OnboardingConsent,
  type OnboardingSubmissionProblem,
} from "./client-onboarding";
import type { ClientOnboardingChanges } from "./client-onboarding-changes";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingClients } from "./onboarding-clients";
import type { OnboardingConsents } from "./onboarding-consents";
import { profileFactsOf } from "./onboarding-profile-facts";
import type { OnboardingSubmissionStamps } from "./onboarding-submission-stamps";
import { screeningOutcome } from "./onboarding-submission";

type SubmitOnboardingCommand = {
  authSubjectId: string;
  answers: OnboardingAnswersByForm;
  consents: OnboardingConsents;
};

type SubmitOnboardingResult =
  | { status: "submitted"; submittedAt: Date }
  | { status: "not-on-journey" }
  | { status: "already-submitted" }
  | { status: "consent-missing"; consent: OnboardingConsent }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type SubmitOnboardingUseCaseOptions = {
  clients: OnboardingClients;
  onboardings: ClientOnboardingSource;
  unitPreferences: ClientUnitPreferencesSource;
  changes: ClientOnboardingChanges;
  stamps: OnboardingSubmissionStamps;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class SubmitOnboardingUseCase {
  constructor(private readonly options: SubmitOnboardingUseCaseOptions) {}

  async execute(
    command: SubmitOnboardingCommand,
  ): Promise<SubmitOnboardingResult> {
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    const [stored, preference] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.unitPreferences.findByClientId(client.clientId),
    ]);
    const onboarding = ClientOnboarding.reconstitute({ client, ...stored });
    const now = this.options.clock.now();

    const outcome = onboarding.submit({
      answers: command.answers,
      consents: command.consents,
      units: measureUnitsOf(
        (preference ?? UnitPreference.metric()).toSnapshot(),
      ),
      now,
    });

    if (outcome.status === "already-submitted") {
      return this.refuseAlreadySubmitted({
        clientId: client.clientId,
        at: onboarding.submission?.submittedAt ?? now,
      });
    }

    if (outcome.status !== "submitted") {
      this.options.incidents.onboardingSubmissionRefused({
        clientId: client.clientId,
        reason: outcome.status,
      });

      return outcome;
    }

    const recorded = await this.options.changes.recordSubmission({
      clientId: client.clientId,
      submission: outcome.submission,
      measurementEntry: outcome.measurementEntry,
      profile: ClientProfile.fromOnboarding({
        clientId: client.clientId,
        facts: profileFactsOf(outcome.submission.answers),
        now,
      }),
    });

    if (recorded === "already-submitted") {
      return this.refuseAlreadySubmitted({
        clientId: client.clientId,
        at: await this.concurrentSubmissionTime(client.clientId, now),
      });
    }

    const { submittedAt } = outcome.submission;
    await this.options.stamps.recordOnboardingSubmitted({
      clientId: client.clientId,
      at: submittedAt,
    });
    this.options.incidents.onboardingSubmissionAccepted({
      clientId: client.clientId,
      screeningOutcome: screeningOutcome({
        answers: outcome.submission.answers,
        dateOfBirth: onboarding.dateOfBirth,
        now,
      }),
    });

    return { status: "submitted", submittedAt };
  }

  private async concurrentSubmissionTime(
    clientId: string,
    now: Date,
  ): Promise<Date> {
    const stored = await this.options.onboardings.findByClientId(clientId);

    return stored.submission?.submittedAt ?? now;
  }

  private async refuseAlreadySubmitted(stamp: {
    clientId: string;
    at: Date;
  }): Promise<SubmitOnboardingResult> {
    await this.options.stamps.recordOnboardingSubmitted(stamp);
    this.options.incidents.onboardingSubmissionRefused({
      clientId: stamp.clientId,
      reason: "already-submitted",
    });

    return { status: "already-submitted" };
  }
}
