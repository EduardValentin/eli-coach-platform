import type { MeasurementIdsPort } from "../measurement";
import type { ClockPort } from "../clock-port";
import {
  measureUnitsOf,
  UnitPreference,
  type ClientSettingsSourcePort,
} from "../client-settings";

import {
  ClientOnboarding,
  type OnboardingConsent,
  type OnboardingSubmissionProblem,
} from "./client-onboarding";
import type { ClientOnboardingChangesPort } from "./client-onboarding-changes-port";
import type { ClientOnboardingIncidentsPort } from "./client-onboarding-incidents-port";
import type { ClientOnboardingSourcePort } from "./client-onboarding-source-port";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingConsents } from "./onboarding-consents";
import type { OnboardingParticipants } from "./onboarding-participants";
import type { OnboardingSubmissionStampsPort } from "./onboarding-submission-stamps-port";
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
  clientOnboardingSourcePort: ClientOnboardingSourcePort;
  clientSettingsSourcePort: ClientSettingsSourcePort;
  clientOnboardingChangesPort: ClientOnboardingChangesPort;
  measurementIdsPort: MeasurementIdsPort;
  onboardingSubmissionStampsPort: OnboardingSubmissionStampsPort;
  clockPort: ClockPort;
  clientOnboardingIncidentsPort: ClientOnboardingIncidentsPort;
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
    const now = this.options.clockPort.now();

    if (!client.standing.hasPortalAccessAt(now)) {
      return { status: "ended" };
    }

    const [stored, settings] = await Promise.all([
      this.options.clientOnboardingSourcePort.findByClientId(client.clientId),
      this.options.clientSettingsSourcePort.findByClientId(client.clientId),
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
      this.options.clientOnboardingIncidentsPort.onboardingSubmissionRefused({
        clientId: client.clientId,
        reason: outcome.status,
      });

      return outcome;
    }

    const entryId = this.options.measurementIdsPort.generate();
    const recorded =
      await this.options.clientOnboardingChangesPort.recordSubmission({
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
    await this.options.onboardingSubmissionStampsPort.recordOnboardingSubmitted(
      {
        clientId: client.clientId,
        at: submittedAt,
      },
    );
    this.options.clientOnboardingIncidentsPort.onboardingSubmissionAccepted({
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
    const stored =
      await this.options.clientOnboardingSourcePort.findByClientId(clientId);

    return stored.submission?.submittedAt ?? now;
  }

  private async refuseAlreadySubmitted(stamp: {
    clientId: string;
    at: Date;
  }): Promise<SubmitOnboardingResult> {
    await this.options.onboardingSubmissionStampsPort.recordOnboardingSubmitted(
      stamp,
    );
    this.options.clientOnboardingIncidentsPort.onboardingSubmissionRefused({
      clientId: stamp.clientId,
      reason: "already-submitted",
    });

    return { status: "already-submitted" };
  }
}
