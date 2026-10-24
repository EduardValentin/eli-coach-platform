import { zodResolver } from "@hookform/resolvers/zod";
import { SettingsBody, SettingsSection } from "@eli-coach-platform/ui/portal";
import { toast } from "@eli-coach-platform/ui/toast";
import { Dumbbell, Lock } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";

import { possessivePronoun } from "~/features/assessment-calls/public/visitor-profile";
import {
  clientProfileProblemsAnswerSchema,
  clientProfileSavedAnswerSchema,
  coachProfileRequestSchema,
  type ClientProfileView,
} from "~/features/client-profile/public/client-profile";
import { coachClientProfileApiPath } from "~/features/client-profile/public/paths";
import { COACH_MEASURE_UNITS } from "~/features/client-profile/ui/shared/measure-field/coach-measure-units";
import { ProfileFieldRows } from "~/features/client-profile/ui/shared/profile/profile-field-control";
import {
  COACHING_FIELDS,
  coachingOf,
  coachingProblemMessages,
  coachingValues,
  profileFieldsSchema,
  SHARED_FACT_FIELDS,
  type CoachingValues,
  type ProfileField,
} from "~/features/client-profile/ui/shared/profile/profile-fields";
import {
  PROFILE_SAVE_TOASTS,
  ProfileFormSection,
} from "~/features/client-profile/ui/shared/profile/profile-form-section";
import {
  useProfileSectionSave,
  type ProfileSectionOutcome,
} from "~/features/client-profile/ui/shared/profile/use-profile-section-save";

import { CycleModeInfo } from "./cycle-mode-info";

type CoachingSectionProps = {
  clientId: string;
  profile: ClientProfileView;
};

type CoachingFormProps = {
  clientId: string;
  profile: ClientProfileView & {
    coaching: NonNullable<ClientProfileView["coaching"]>;
  };
};

type CoachingProblems = Parameters<typeof coachingProblemMessages>[0];

const HEADING_ID = "client-profile-coaching-heading";

const PARITY_ROOT = "ClientProfileCoaching";

const COACH_ONLY_FIELDS: readonly ProfileField[] = [
  COACHING_FIELDS.level,
  COACHING_FIELDS.primaryGoal,
  COACHING_FIELDS.goalWeight,
  COACHING_FIELDS.activityLevel,
];

const CLOSING_FIELDS: readonly ProfileField[] = [
  COACHING_FIELDS.dietaryRestrictions,
  COACHING_FIELDS.coachNotes,
];

const COACHING_ADORNMENTS = {
  cycleMode: <CycleModeInfo />,
  coachNotes: (
    <Lock aria-hidden="true" className="text-text-secondary" size={14} />
  ),
};

function coachingFieldsFor(profile: ClientProfileView): ProfileField[] {
  const cycleFields =
    profile.identity.gender === "male" ? [] : [COACHING_FIELDS.cycleMode];

  return [
    ...SHARED_FACT_FIELDS,
    ...COACH_ONLY_FIELDS,
    ...cycleFields,
    ...CLOSING_FIELDS,
  ];
}

function CoachingForm({ clientId, profile }: CoachingFormProps) {
  const units = COACH_MEASURE_UNITS;
  const fields = coachingFieldsFor(profile);
  const submitted = useRef<CoachingValues | null>(null);
  const form = useForm<CoachingValues>({
    defaultValues: coachingValues(profile, units),
    resolver: zodResolver(profileFieldsSchema<CoachingValues>(fields, units)),
  });
  const possessive = possessivePronoun(profile.identity.gender);

  const settle = (outcome: ProfileSectionOutcome<CoachingProblems>) => {
    if (outcome.status === "saved") {
      form.reset(submitted.current ?? form.getValues());
      toast.success(PROFILE_SAVE_TOASTS.saved);
      return;
    }

    const problems =
      outcome.status === "invalid"
        ? coachingProblemMessages(outcome.problems, units)
        : [];

    if (problems.length === 0) {
      toast.error(PROFILE_SAVE_TOASTS.unsaved);
      return;
    }

    problems.forEach(({ field, message }, index) =>
      form.setError(field, { message }, { shouldFocus: index === 0 }),
    );
  };

  const { save, saving } = useProfileSectionSave({
    action: coachClientProfileApiPath(clientId),
    onSettled: settle,
    problemsAnswer: clientProfileProblemsAnswerSchema,
    savedAnswer: clientProfileSavedAnswerSchema,
  });

  const submit = form.handleSubmit((values) => {
    const request = coachProfileRequestSchema.safeParse(
      coachingOf(values, units),
    );

    if (!request.success) {
      toast.error(PROFILE_SAVE_TOASTS.unsaved);
      return;
    }

    submitted.current = values;
    save(request.data);
  });

  return (
    <ProfileFormSection
      heading={{
        description: `What ${possessive.lower} program is built from.`,
        icon: Dumbbell,
        id: HEADING_ID,
        title: "Coaching",
      }}
      parityRoot={PARITY_ROOT}
      submission={{ changed: form.formState.isDirty, onSubmit: submit, saving }}
    >
      <ProfileFieldRows
        adornments={COACHING_ADORNMENTS}
        control={form.control}
        fields={fields}
        units={units}
      />
    </ProfileFormSection>
  );
}

export function CoachingSection({ clientId, profile }: CoachingSectionProps) {
  const { coaching } = profile;

  if (coaching) {
    return (
      <CoachingForm clientId={clientId} profile={{ ...profile, coaching }} />
    );
  }

  const possessive = possessivePronoun(profile.identity.gender);

  return (
    <SettingsSection
      data-parity-root={PARITY_ROOT}
      headingId={HEADING_ID}
      icon={Dumbbell}
      title="Coaching"
    >
      <SettingsBody>
        <p
          className="text-sm text-text-secondary"
          data-parity="coaching-pending"
        >
          These fill in once {possessive.lower} answers are approved.
        </p>
      </SettingsBody>
    </SettingsSection>
  );
}
