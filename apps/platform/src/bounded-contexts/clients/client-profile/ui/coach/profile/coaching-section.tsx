import { zodResolver } from "@hookform/resolvers/zod";
import {
  CANONICAL_MEASURE_UNITS,
  type MeasureUnits,
} from "~/bounded-contexts/clients/client-profile/domain/client-settings";
import { SettingsBody, SettingsSection } from "~/shared/design-system/portal";
import { toast } from "~/shared/design-system/toast";
import { Dumbbell, Lock } from "lucide-react";
import { useForm } from "react-hook-form";

import { possessivePronoun } from "~/bounded-contexts/clients/client-profile/public/client-pronouns";
import {
  clientProfileProblemsAnswerSchema,
  clientProfileSavedAnswerSchema,
  coachProfileRequestSchema,
  type ClientProfileView,
} from "~/bounded-contexts/clients/client-profile/public/client-profile";
import { coachClientProfileApiPath } from "~/bounded-contexts/clients/client-profile/public/paths";
import { ProfileFieldRows } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-field-control";
import {
  canonicalMeasure,
  COACHING_FIELDS,
  lengthProblemMessage,
  measureValue,
  outOfRangeMessage,
  presentProblems,
  profileFieldsSchema,
  requiredMessage,
  SHARED_FACT_FIELDS,
  sharedFactProblemMessages,
  sharedFactsOf,
  sharedFactValues,
  type FactProblemMessage,
  type ProfileField,
  type SharedFactValues,
} from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-fields";
import {
  PROFILE_SAVE_TOASTS,
  ProfileFormSection,
} from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-form-section";
import { useProfileSectionSave } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/use-profile-section-save";

import { CycleModeInfo } from "./cycle-mode-info";

type CoachingSectionProps = {
  clientId: string;
  profile: ClientProfileView;
};

type CoachingFactsView = NonNullable<ClientProfileView["coaching"]>;

type CoachingFormProps = {
  clientId: string;
  profile: ClientProfileView & { coaching: CoachingFactsView };
};

type CoachingValues = SharedFactValues & {
  level: string;
  primaryGoal: string;
  goalWeight: string;
  activityLevel: string;
  cycleMode: string;
  dietaryRestrictions: string;
  coachNotes: string;
};

type CoachingField = ProfileField & { id: keyof CoachingValues };

type CoachingProblems = Parameters<typeof sharedFactProblemMessages>[0];

const HEADING_ID = "client-profile-coaching-heading";

const PARITY_ROOT = "ClientProfileCoaching";

const COACH_ONLY_FIELDS = [
  COACHING_FIELDS.level,
  COACHING_FIELDS.primaryGoal,
  COACHING_FIELDS.goalWeight,
  COACHING_FIELDS.activityLevel,
] as const;

const CLOSING_FIELDS = [
  COACHING_FIELDS.dietaryRestrictions,
  COACHING_FIELDS.coachNotes,
] as const;

const COACHING_ADORNMENTS = {
  cycleMode: <CycleModeInfo />,
  coachNotes: (
    <Lock aria-hidden="true" className="text-text-secondary" size={14} />
  ),
};

function coachingFieldsFor(profile: ClientProfileView): CoachingField[] {
  const cycleFields =
    profile.identity.gender === "male" ? [] : [COACHING_FIELDS.cycleMode];

  return [
    ...SHARED_FACT_FIELDS,
    ...COACH_ONLY_FIELDS,
    ...cycleFields,
    ...CLOSING_FIELDS,
  ];
}

function coachingValues(
  profile: CoachingFormProps["profile"],
  units: MeasureUnits,
): CoachingValues {
  const { coaching } = profile;

  return {
    ...sharedFactValues(coaching, units),
    level: coaching.level,
    primaryGoal: coaching.primaryGoal ?? "",
    goalWeight: measureValue("weight", coaching.goalWeightKg, units),
    activityLevel: coaching.activityLevel ?? "",
    cycleMode: coaching.cycleMode,
    dietaryRestrictions: coaching.dietaryRestrictions,
    coachNotes: profile.coachNotes ?? "",
  };
}

function coachingOf(values: CoachingValues, units: MeasureUnits) {
  return {
    coaching: {
      ...sharedFactsOf(values, units),
      level: values.level,
      primaryGoal: values.primaryGoal || null,
      goalWeightKg: canonicalMeasure("weight", values.goalWeight, units),
      activityLevel: values.activityLevel || null,
      cycleMode: values.cycleMode,
      dietaryRestrictions: values.dietaryRestrictions.trim(),
    },
    coachNotes: values.coachNotes.trim() || null,
  };
}

function coachingProblemMessages(
  problems: CoachingProblems,
  units: MeasureUnits,
): FactProblemMessage<CoachingValues>[] {
  return [
    ...sharedFactProblemMessages(problems, units),
    ...presentProblems<CoachingValues>([
      problems.primaryGoal
        ? {
            field: "primaryGoal",
            message: requiredMessage(COACHING_FIELDS.primaryGoal),
          }
        : null,
      problems.goalWeightKg
        ? {
            field: "goalWeight",
            message: outOfRangeMessage(COACHING_FIELDS.goalWeight, units),
          }
        : null,
      problems.dietaryRestrictions
        ? {
            field: "dietaryRestrictions",
            message: requiredMessage(COACHING_FIELDS.dietaryRestrictions),
          }
        : null,
      problems.coachNotes
        ? {
            field: "coachNotes",
            message: lengthProblemMessage(COACHING_FIELDS.coachNotes.maxLength),
          }
        : null,
    ]),
  ];
}

function CoachingForm({ clientId, profile }: CoachingFormProps) {
  const units = CANONICAL_MEASURE_UNITS;
  const fields = coachingFieldsFor(profile);
  const form = useForm<CoachingValues>({
    defaultValues: coachingValues(profile, units),
    resolver: zodResolver(profileFieldsSchema<CoachingValues>(fields, units)),
  });
  const { save, saving } = useProfileSectionSave({
    endpoint: {
      action: coachClientProfileApiPath(clientId),
      problemsAnswer: clientProfileProblemsAnswerSchema,
      savedAnswer: clientProfileSavedAnswerSchema,
    },
    form,
    problemMessagesOf: (problems) => coachingProblemMessages(problems, units),
  });
  const possessive = possessivePronoun(profile.identity.gender);

  const submit = form.handleSubmit((values) => {
    const request = coachProfileRequestSchema.safeParse(
      coachingOf(values, units),
    );

    if (!request.success) {
      toast.error(PROFILE_SAVE_TOASTS.unsaved);
      return;
    }

    save(values, request.data);
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
