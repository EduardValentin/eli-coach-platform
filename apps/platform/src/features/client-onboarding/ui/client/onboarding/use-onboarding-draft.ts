import {
  hasStartedAnswering,
  type OnboardingFormDefinition,
} from "@eli-coach-platform/domain/client-onboarding";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  OnboardingConsentInstants,
  OnboardingPage,
  SaveDraftRequest,
} from "~/features/client-onboarding/contracts/onboarding";

import { readNewerPendingDraft } from "./draft-sync";
import { currentStepOf } from "./onboarding-steps";
import { useDraftSync } from "./use-draft-sync";

export type WizardDraft = Omit<SaveDraftRequest, "formId">;

export type Consent = "specialCategory" | "disclaimer" | "progressPhotos";

const CONSENT_KEYS: Record<Consent, keyof OnboardingConsentInstants> = {
  specialCategory: "specialCategoryAt",
  disclaimer: "disclaimerAt",
  progressPhotos: "progressPhotosAt",
};

type OnboardingDraftOptions = {
  page: OnboardingPage;
  steps: readonly OnboardingFormDefinition[];
};

function grantConsent(
  consents: OnboardingConsentInstants,
  consent: Consent,
): OnboardingConsentInstants {
  return { ...consents, [CONSENT_KEYS[consent]]: new Date().toISOString() };
}

function withdrawConsent(
  consents: OnboardingConsentInstants,
  consent: Consent,
): OnboardingConsentInstants {
  return { ...consents, [CONSENT_KEYS[consent]]: null };
}

function wizardDraftOf({
  answers,
  consents,
  currentFormIndex,
}: WizardDraft): WizardDraft {
  return { answers, consents, currentFormIndex };
}

export function useOnboardingDraft({ page, steps }: OnboardingDraftOptions) {
  const { discardUnsentDraft, queue, resend, saveState, stopSaving } =
    useDraftSync(page.clientId);
  const [draft, setDraft] = useState<WizardDraft>(() =>
    wizardDraftOf(page.draft),
  );
  const [resumed, setResumed] = useState(page.resumed);
  const [formResetKey, setFormResetKey] = useState(0);
  const draftRef = useRef(draft);

  const latestDraft = useCallback(() => draftRef.current, []);

  const replaceDraft = useCallback((next: WizardDraft) => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  const saveDraft = useCallback(
    (next: WizardDraft) => {
      replaceDraft(next);
      queue({ ...next, formId: currentStepOf(steps, next).id });
    },
    [queue, replaceDraft, steps],
  );

  const grant = useCallback(
    (consent: Consent) => {
      const current = draftRef.current;
      saveDraft({
        ...current,
        consents: grantConsent(current.consents, consent),
      });
    },
    [saveDraft],
  );

  const withdraw = useCallback(
    (consent: Consent) => {
      const current = draftRef.current;
      saveDraft({
        ...current,
        consents: withdrawConsent(current.consents, consent),
      });
    },
    [saveDraft],
  );

  useEffect(() => {
    const pending = readNewerPendingDraft({
      clientId: page.clientId,
      serverUpdatedAt: page.draft.updatedAt,
    });
    if (!pending) return;

    const restored = wizardDraftOf(pending.draft);
    replaceDraft(restored);
    setFormResetKey((current) => current + 1);
    setResumed((current) => current || hasStartedAnswering(restored.answers));
    resend(pending);
  }, [page.clientId, page.draft.updatedAt, replaceDraft, resend]);

  return {
    discardUnsentDraft,
    draft,
    formResetKey,
    grant,
    latestDraft,
    replaceDraft,
    resumed,
    saveDraft,
    saveState,
    stopSaving,
    withdraw,
  };
}

export type OnboardingDraftControls = ReturnType<typeof useOnboardingDraft>;
