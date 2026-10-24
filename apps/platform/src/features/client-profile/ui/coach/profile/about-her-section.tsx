import { zodResolver } from "@hookform/resolvers/zod";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { toast } from "@eli-coach-platform/ui/toast";
import { UserRound } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";

import {
  objectPronoun,
  subjectPronoun,
} from "~/features/assessment-calls/public/visitor-profile";
import type { ClientProfileView } from "~/features/client-profile/public/client-profile";
import {
  coachIdentitySchema,
  IDENTITY_FIELDS,
  identityProblemMessages,
  identityRequestOf,
  identityValues,
  type IdentityValues,
} from "~/features/client-profile/ui/shared/profile/identity-form";
import { IdentityFields } from "~/features/client-profile/ui/shared/profile/identity-fields";
import { ProfileFieldRows } from "~/features/client-profile/ui/shared/profile/profile-field-control";
import {
  PROFILE_SAVE_TOASTS,
  ProfileFormSection,
} from "~/features/client-profile/ui/shared/profile/profile-form-section";
import {
  useProfileSectionSave,
  type ProfileSectionOutcome,
} from "~/features/client-profile/ui/shared/profile/use-profile-section-save";
import {
  clientIdentityProblemsAnswerSchema,
  clientIdentitySavedAnswerSchema,
} from "~/features/clients/public/client-identity";
import { coachClientIdentityPath } from "~/features/clients/public/paths";
import { COACH_MEASURE_UNITS } from "~/features/client-profile/ui/shared/measure-field/coach-measure-units";

type AboutHerSectionProps = {
  clientId: string;
  identity: ClientProfileView["identity"];
};

type IdentityProblems = Parameters<typeof identityProblemMessages>[0];

const GENDER_FIELDS = [IDENTITY_FIELDS.gender];

export function AboutHerSection({ clientId, identity }: AboutHerSectionProps) {
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());
  const submitted = useRef<IdentityValues | null>(null);
  const form = useForm<IdentityValues>({
    defaultValues: identityValues(identity),
    resolver: zodResolver(coachIdentitySchema({ now, timeZone })),
  });
  const subject = subjectPronoun(identity.gender);
  const object = objectPronoun(identity.gender);

  const settle = (outcome: ProfileSectionOutcome<IdentityProblems>) => {
    if (outcome.status === "saved") {
      form.reset(submitted.current ?? form.getValues());
      toast.success(PROFILE_SAVE_TOASTS.saved);
      return;
    }

    const problems =
      outcome.status === "invalid"
        ? identityProblemMessages(outcome.problems)
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
    action: coachClientIdentityPath(clientId),
    onSettled: settle,
    problemsAnswer: clientIdentityProblemsAnswerSchema,
    savedAnswer: clientIdentitySavedAnswerSchema,
  });

  const submit = form.handleSubmit((values) => {
    submitted.current = values;
    save(identityRequestOf(values));
  });

  return (
    <ProfileFormSection
      heading={{
        description: `Who ${subject.lower} ${subject.isVerb} and how to reach ${object}.`,
        icon: UserRound,
        id: "client-profile-about-heading",
        title: `About ${object}`,
      }}
      parityRoot="ClientProfileAbout"
      submission={{ changed: form.formState.isDirty, onSubmit: submit, saving }}
    >
      <IdentityFields
        control={form.control}
        email={{
          address: identity.email,
          description: `How ${subject.lower} sign${subject.regularVerbSuffix} in.`,
          hint: `${subject.capitalised} sign${subject.regularVerbSuffix} in and pay${subject.regularVerbSuffix} with this address, so it can't be changed.`,
        }}
        idPrefix="client-profile"
      />
      <ProfileFieldRows
        control={form.control}
        fields={GENDER_FIELDS}
        units={COACH_MEASURE_UNITS}
      />
    </ProfileFormSection>
  );
}
