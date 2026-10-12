import type { Clock } from "../shared";

import { ClientOnboarding } from "./client-onboarding";
import type { ClientOnboardingChanges } from "./client-onboarding-changes";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingConsents } from "./onboarding-consents";
import type { OnboardingParticipants } from "./onboarding-participants";
import type { OnboardingFormId } from "./onboarding-schema";

type SaveOnboardingDraftCommand = {
  authSubjectId: string;
  formId: OnboardingFormId;
  answers: OnboardingAnswersByForm;
  currentFormIndex: number;
  consents: OnboardingConsents;
};

type SaveOnboardingDraftResult =
  | { status: "saved" }
  | { status: "not-on-journey" }
  | { status: "ended" }
  | { status: "already-submitted" };

type SaveOnboardingDraftUseCaseOptions = {
  participants: Pick<OnboardingParticipants, "byAuthSubjectId">;
  onboardings: ClientOnboardingSource;
  changes: ClientOnboardingChanges;
  clock: Clock;
  incidents: ClientOnboardingIncidents;
};

export class SaveOnboardingDraftUseCase {
  constructor(private readonly options: SaveOnboardingDraftUseCaseOptions) {}

  async execute(
    command: SaveOnboardingDraftCommand,
  ): Promise<SaveOnboardingDraftResult> {
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

    const stored = await this.options.onboardings.findByClientId(
      client.clientId,
    );
    const onboarding = ClientOnboarding.reconstitute({
      client: identity,
      ...stored,
    });

    if (onboarding.isSubmitted()) {
      return { status: "already-submitted" };
    }

    const incident = { clientId: client.clientId, formId: command.formId };
    const draft = onboarding.draftFrom({
      answers: command.answers,
      currentFormIndex: command.currentFormIndex,
      consents: command.consents,
      now,
    });

    const saved = await this.options.changes
      .saveDraft({ clientId: client.clientId, draft })
      .catch((error: unknown) => {
        this.options.incidents.onboardingDraftSaveFailed(incident);
        throw error;
      });

    if (saved === "already-submitted") {
      return { status: "already-submitted" };
    }

    this.options.incidents.onboardingDraftSaved(incident);

    return { status: "saved" };
  }
}
