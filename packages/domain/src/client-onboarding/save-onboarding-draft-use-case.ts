import type { Clock } from "../shared";

import { ClientOnboarding } from "./client-onboarding";
import type { ClientOnboardingChanges } from "./client-onboarding-changes";
import type { ClientOnboardingIncidents } from "./client-onboarding-incidents";
import type { ClientOnboardingSource } from "./client-onboarding-source";
import type { OnboardingAnswersByForm } from "./onboarding-answers";
import type { OnboardingClients } from "./onboarding-clients";
import type { OnboardingConsents } from "./onboarding-consents";
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
  | { status: "already-submitted" };

type SaveOnboardingDraftUseCaseOptions = {
  clients: OnboardingClients;
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
    const client = await this.options.clients.findByAuthSubjectId(
      command.authSubjectId,
    );

    if (!client) {
      return { status: "not-on-journey" };
    }

    const stored = await this.options.onboardings.findByClientId(
      client.clientId,
    );
    const onboarding = ClientOnboarding.reconstitute({ client, ...stored });

    if (onboarding.isSubmitted()) {
      return { status: "already-submitted" };
    }

    const incident = { clientId: client.clientId, formId: command.formId };
    const draft = onboarding.draftFrom({
      answers: command.answers,
      currentFormIndex: command.currentFormIndex,
      consents: command.consents,
      now: this.options.clock.now(),
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
