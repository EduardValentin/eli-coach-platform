import {
  hasStartedAnswering,
  type OnboardingFormDefinition,
} from "@eli-coach-platform/domain/client-onboarding";
import type { UnitPreferenceSnapshot } from "@eli-coach-platform/domain/unit-preference";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  OnboardingConsentInstants,
  OnboardingWizardPage,
  SaveDraftRequest,
} from "~/features/client-onboarding/public/onboarding";

import { readUnsentEdits } from "./draft-sync";
import { currentStepOf } from "./onboarding-steps";
import { useUnitPreference } from "./unit-preference-store";
import { useDraftSync } from "./use-draft-sync";

export type WizardDraft = Omit<SaveDraftRequest, "formId">;

export type Consent = "specialCategory" | "disclaimer" | "progressPhotos";

const CONSENT_KEYS: Record<Consent, keyof OnboardingConsentInstants> = {
  specialCategory: "specialCategoryAt",
  disclaimer: "disclaimerAt",
  progressPhotos: "progressPhotosAt",
};

type OnboardingDraftOptions = {
  page: OnboardingWizardPage;
  steps: readonly OnboardingFormDefinition[];
};

function consentsGranted(
  consents: OnboardingConsentInstants,
  consent: Consent,
): OnboardingConsentInstants {
  return { ...consents, [CONSENT_KEYS[consent]]: new Date().toISOString() };
}

function consentsWithdrawn(
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
  const {
    discardUnsentDraft,
    queue,
    queueUnitPreference,
    resend,
    saveState,
    stopSaving,
  } = useDraftSync(page.clientId);
  const choosePreference = useUnitPreference((state) => state.choosePreference);
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

  const grantConsent = useCallback(
    (consent: Consent) => {
      const current = draftRef.current;
      saveDraft({
        ...current,
        consents: consentsGranted(current.consents, consent),
      });
    },
    [saveDraft],
  );

  const withdrawConsent = useCallback(
    (consent: Consent) => {
      const current = draftRef.current;
      saveDraft({
        ...current,
        consents: consentsWithdrawn(current.consents, consent),
      });
    },
    [saveDraft],
  );

  const saveUnitPreference = useCallback(
    (preference: UnitPreferenceSnapshot) => {
      choosePreference(preference);
      queueUnitPreference(preference);
    },
    [choosePreference, queueUnitPreference],
  );

  const restoreDraft = useCallback(
    (unsentDraft: SaveDraftRequest) => {
      const restored = wizardDraftOf(unsentDraft);
      replaceDraft(restored);
      setFormResetKey((current) => current + 1);
      setResumed((current) => current || hasStartedAnswering(restored.answers));
    },
    [replaceDraft],
  );

  useEffect(() => {
    const unsent = readUnsentEdits({
      clientId: page.clientId,
      serverUpdatedAt: page.draft.updatedAt,
    });
    if (!unsent) return;

    if (unsent.draft) restoreDraft(unsent.draft.draft);
    if (unsent.unitPreference) choosePreference(unsent.unitPreference);
    resend(unsent);
  }, [
    choosePreference,
    page.clientId,
    page.draft.updatedAt,
    resend,
    restoreDraft,
  ]);

  return {
    discardUnsentDraft,
    draft,
    formResetKey,
    grantConsent,
    latestDraft,
    replaceDraft,
    resumed,
    saveDraft,
    saveState,
    saveUnitPreference,
    stopSaving,
    withdrawConsent,
  };
}

export type OnboardingDraftControls = ReturnType<typeof useOnboardingDraft>;
