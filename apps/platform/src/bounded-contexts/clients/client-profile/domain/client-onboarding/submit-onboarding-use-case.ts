import type { MeasurementIds } from "../measurement";
import type { Clock } from "../clock";
import {
  measureUnitsOf,
  UnitPreference,
  type ClientSettingsSource,
} from "../client-settings";

import {
  ClientOnboarding,
  type OnboardingConsent,
  type OnboardingSubmissionProblem,
} from "./client-onboarding";
import type { ClientOnboardingChanges } from "./client-onboarding-changes";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingConsents } from "./onboarding-consents";
import type { OnboardingParticipants } from "./onboarding-participants";
import type { OnboardingSubmissionStamps } from "./onboarding-submission-stamps";
import { screeningOutcome } from "./onboarding-submission";

type SubmitOnboardingCommand = {
  authSubjectId: string;
  answers: OnboardingAnswersByForm;
  consents: OnboardingConsents;
};

type SubmitOnboardingResult =
  | {
      status: "submitted";
      submittedAt: Date;
      clientId: string;
      entryId: string;
    }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "already-submitted" }
  | { status: "consent-missing"; consent: OnboardingConsent }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type SubmitOnboardingUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  onboardings: ClientOnboardingSource;
  settings: ClientSettingsSource;
  changes: ClientOnboardingChanges;
  measurementIds: MeasurementIds;
  stamps: OnboardingSubmissionStamps;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class SubmitOnboardingUseCase {
  constructor(private readonly options: SubmitOnboardingUseCaseOptions) {}

  async execute(
    command: SubmitOnboardingCommand,
  ): Promise<SubmitOnboardingResult> {
    const participant = await this.options.participants.byAuthSubjectId(
      command.authSubjectId,
    );

    if (!participant) {
      return { status: "not-on-journey" };
    }

    const { client, identity } = participant;
    const now = this.options.clock.now();

    if (!client.standing.hasPortalAccessAt(now)) {
      return { status: "ended" };
    }

    const [stored, settings] = await Promise.all([
      this.options.onboardings.findByClientId(client.clientId),
      this.options.settings.findByClientId(client.clientId),
    ]);
    const onboarding = ClientOnboarding.reconstitute({
      client: identity,
      ...stored,
    });
    const outcome = onboarding.submit({
      answers: command.answers,
      consents: command.consents,
      units: measureUnitsOf(
        (settings?.unitPreference() ?? UnitPreference.metric()).toSnapshot(),
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

    const entryId = this.options.measurementIds.generate();
    const recorded = await this.options.changes.recordSubmission({
      clientId: client.clientId,
      submission: outcome.submission,
      entryId,
      measurementEntry: outcome.measurementEntry,
    });

    if (recorded.status === "already-submitted") {
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

    return {
      status: "submitted",
      submittedAt,
      clientId: client.clientId,
      entryId,
    };
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
