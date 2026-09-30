import type { VisitorGender } from "../assessment-call";
import type { MeasurementEntry } from "../measurement";
import type { MeasureUnits } from "../unit-preference";

import {
  emptyAnswers,
  withoutUnreachable,
  type OnboardingAnswersByForm,
} from "./onboarding-answers";
import type { OnboardingClient } from "./onboarding-clients";
import type { OnboardingConsents } from "./onboarding-consents";
import type { OnboardingDraft } from "./onboarding-draft";
import {
  MEASUREMENT_FIELD_IDS,
  submittedMeasurementEntry,
} from "./onboarding-measurements";
import {
  formsForGender,
  type OnboardingFormDefinition,
  type OnboardingFormId,
} from "./onboarding-schema";
import {
  needsManualScreening,
  type OnboardingSubmission,
} from "./onboarding-submission";
import {
  fieldProblem,
  formProblems,
  type OnboardingValidationOptions,
} from "./onboarding-validation";

export type OnboardingConsent = "special-category" | "disclaimer";

export type OnboardingSubmissionProblem = {
  formId: OnboardingFormId;
  fieldId: string;
  message: string;
};

type OnboardingSubmitOutcome =
  | {
      status: "submitted";
      submission: OnboardingSubmission;
      measurementEntry: MeasurementEntry;
    }
  | { status: "already-submitted" }
  | { status: "consent-missing"; consent: OnboardingConsent }
  | { status: "invalid"; problems: OnboardingSubmissionProblem[] };

type ClientOnboardingProps = {
  client: OnboardingClient;
  draft: OnboardingDraft | null;
  submission: OnboardingSubmission | null;
};

type OnboardingDraftInput = {
  answers: OnboardingAnswersByForm;
  currentFormIndex: number;
  consents: OnboardingConsents;
  now: Date;
};

type OnboardingSubmitInput = {
  answers: OnboardingAnswersByForm;
  consents: OnboardingConsents;
  units: MeasureUnits;
  now: Date;
};

const SAFETY_SCREENING_FORM_ID: OnboardingFormId = "safety-screening";

const REQUIRED_MEASUREMENTS: readonly {
  formId: OnboardingFormId;
  fieldId: string;
}[] = [
  { formId: "goal-availability", fieldId: MEASUREMENT_FIELD_IDS.weight },
  { formId: "measurements", fieldId: MEASUREMENT_FIELD_IDS.waist },
];

function missingConsentOf(
  consents: OnboardingConsents,
): OnboardingConsent | null {
  if (!consents.specialCategoryAt) return "special-category";
  if (!consents.disclaimerAt) return "disclaimer";

  return null;
}

export class ClientOnboarding {
  readonly clientId: string;
  readonly gender: VisitorGender;
  readonly dateOfBirth: string;
  readonly draft: OnboardingDraft | null;
  readonly submission: OnboardingSubmission | null;

  private constructor(props: ClientOnboardingProps) {
    this.clientId = props.client.clientId;
    this.gender = props.client.gender;
    this.dateOfBirth = props.client.dateOfBirth;
    this.draft = props.draft;
    this.submission = props.submission;
  }

  static reconstitute(props: ClientOnboardingProps): ClientOnboarding {
    return new ClientOnboarding(props);
  }

  forms(): OnboardingFormDefinition[] {
    return formsForGender(this.gender);
  }

  isSubmitted(): boolean {
    return this.submission !== null;
  }

  manualScreeningOn(now: Date): boolean {
    return needsManualScreening(this.dateOfBirth, now);
  }

  draftFrom(input: OnboardingDraftInput): OnboardingDraft {
    const lastFormIndex = this.forms().length - 1;

    return {
      answers: this.askedAnswers(input.answers, input.now),
      currentFormIndex: Math.min(
        Math.max(input.currentFormIndex, 0),
        lastFormIndex,
      ),
      consents: input.consents,
      updatedAt: input.now,
    };
  }

  submit(input: OnboardingSubmitInput): OnboardingSubmitOutcome {
    if (this.isSubmitted()) {
      return { status: "already-submitted" };
    }

    const missingConsent = missingConsentOf(input.consents);
    if (missingConsent) {
      return { status: "consent-missing", consent: missingConsent };
    }

    const answers = this.askedAnswers(input.answers, input.now);
    const options = { units: input.units, today: input.now };
    const problems = this.problemsIn(answers, options);
    if (problems.length > 0) {
      return { status: "invalid", problems };
    }

    const measurementEntry = submittedMeasurementEntry(answers, input.now);
    if (!measurementEntry) {
      return {
        status: "invalid",
        problems: this.missingMeasurementProblems(answers, options),
      };
    }

    return {
      status: "submitted",
      submission: {
        answers,
        consents: input.consents,
        submittedAt: input.now,
      },
      measurementEntry,
    };
  }

  private askedForms(now: Date): OnboardingFormDefinition[] {
    const manualScreening = this.manualScreeningOn(now);

    return this.forms().filter(
      (form) => !manualScreening || form.id !== SAFETY_SCREENING_FORM_ID,
    );
  }

  private askedAnswers(
    answers: OnboardingAnswersByForm,
    now: Date,
  ): OnboardingAnswersByForm {
    const asked = emptyAnswers();

    for (const form of this.askedForms(now)) {
      asked[form.id] = withoutUnreachable(form.fields, answers[form.id]);
    }

    return asked;
  }

  private problemsIn(
    answers: OnboardingAnswersByForm,
    options: OnboardingValidationOptions,
  ): OnboardingSubmissionProblem[] {
    return this.askedForms(options.today).flatMap((form) =>
      formProblems(form, answers[form.id], options).map((problem) => ({
        formId: form.id,
        ...problem,
      })),
    );
  }

  private missingMeasurementProblems(
    answers: OnboardingAnswersByForm,
    options: OnboardingValidationOptions,
  ): OnboardingSubmissionProblem[] {
    return REQUIRED_MEASUREMENTS.flatMap(({ formId, fieldId }) => {
      const field = this.forms()
        .find((form) => form.id === formId)
        ?.fields.find((candidate) => candidate.id === fieldId);
      const message = field && fieldProblem(field, answers[formId], options);

      return message ? [{ formId, fieldId, message }] : [];
    });
  }
}
