import { zodResolver } from "@hookform/resolvers/zod";
import {
  measureUnitsOf,
  type UnitPreferenceSnapshot,
} from "@eli-coach-platform/domain/client-settings";
import { toast } from "@eli-coach-platform/ui/toast";
import { Dumbbell } from "lucide-react";
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
import { useProfileSectionSave } from "~/features/client-profile/ui/shared/profile/use-profile-section-save";

type TrainingFormProps = {
  coaching: NonNullable<OwnClientProfileView["coaching"]>;
  unitPreference: UnitPreferenceSnapshot;
};

export function TrainingForm({ coaching, unitPreference }: TrainingFormProps) {
  const units = measureUnitsOf(unitPreference);
  const form = useForm<SharedFactValues>({
    defaultValues: sharedFactValues(coaching, units),
    resolver: zodResolver(
      profileFieldsSchema<SharedFactValues>(SHARED_FACT_FIELDS, units),
    ),
  });
  const { save, saving } = useProfileSectionSave({
    endpoint: {
      action: CLIENT_PROFILE_API_PATHS.ownProfile,
      problemsAnswer: clientProfileProblemsAnswerSchema,
      savedAnswer: clientProfileSavedAnswerSchema,
    },
    form,
    problemMessagesOf: (problems) => sharedFactProblemMessages(problems, units),
  });

  const submit = form.handleSubmit((values) => {
    const request = ownProfileRequestSchema.safeParse({
      facts: sharedFactsOf(values, units),
    });

    if (!request.success) {
      toast.error(PROFILE_SAVE_TOASTS.unsaved);
      return;
    }

    save(values, request.data);
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
