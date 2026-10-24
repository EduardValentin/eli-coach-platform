import { zodResolver } from "@hookform/resolvers/zod";
import {
  measureUnitsOf,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/client-settings";
import { toast } from "@eli-coach-platform/ui/toast";
import { Dumbbell } from "lucide-react";
import { useRef } from "react";
import { useForm } from "react-hook-form";

import {
  clientProfileProblemsAnswerSchema,
  clientProfileSavedAnswerSchema,
} from "~/features/client-profile/public/client-profile";
import {
  ownProfileRequestSchema,
  type OwnClientProfileView,
} from "~/features/client-profile/public/own-client-profile";
import { CLIENT_PROFILE_API_PATHS } from "~/features/client-profile/public/paths";
import { ProfileFieldRows } from "~/features/client-profile/ui/shared/profile/profile-field-control";
import {
  profileFieldsSchema,
  SHARED_FACT_FIELDS,
  sharedFactProblemMessages,
  sharedFactsOf,
  sharedFactValues,
  type SharedFactValues,
} from "~/features/client-profile/ui/shared/profile/profile-fields";
import {
  PROFILE_SAVE_TOASTS,
  ProfileFormSection,
} from "~/features/client-profile/ui/shared/profile/profile-form-section";
import {
  useProfileSectionSave,
  type ProfileSectionOutcome,
} from "~/features/client-profile/ui/shared/profile/use-profile-section-save";

type TrainingFormProps = {
  coaching: NonNullable<OwnClientProfileView["coaching"]>;
  unitPreference: UnitPreferenceSnapshot;
};

type SharedFactProblems = Parameters<typeof sharedFactProblemMessages>[0];

export function TrainingForm({ coaching, unitPreference }: TrainingFormProps) {
  const units = measureUnitsOf(unitPreference);
  const submitted = useRef<SharedFactValues | null>(null);
  const form = useForm<SharedFactValues>({
    defaultValues: sharedFactValues(coaching, units),
    resolver: zodResolver(
      profileFieldsSchema<SharedFactValues>(SHARED_FACT_FIELDS, units),
    ),
  });

  const settle = (outcome: ProfileSectionOutcome<SharedFactProblems>) => {
    if (outcome.status === "saved") {
      form.reset(submitted.current ?? form.getValues());
      toast.success(PROFILE_SAVE_TOASTS.saved);
      return;
    }

    const problems =
      outcome.status === "invalid"
        ? sharedFactProblemMessages(outcome.problems, units)
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
    action: CLIENT_PROFILE_API_PATHS.ownProfile,
    onSettled: settle,
    problemsAnswer: clientProfileProblemsAnswerSchema,
    savedAnswer: clientProfileSavedAnswerSchema,
  });

  const submit = form.handleSubmit((values) => {
    const request = ownProfileRequestSchema.safeParse({
      facts: sharedFactsOf(values, units),
    });

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
        description: "What your coach plans your sessions around.",
        icon: Dumbbell,
        id: "your-training-heading",
        title: "Your training",
      }}
      parityRoot="ClientProfileTraining"
      submission={{ changed: form.formState.isDirty, onSubmit: submit, saving }}
    >
      <ProfileFieldRows
        control={form.control}
        fields={SHARED_FACT_FIELDS}
        units={units}
      />
    </ProfileFormSection>
  );
}
