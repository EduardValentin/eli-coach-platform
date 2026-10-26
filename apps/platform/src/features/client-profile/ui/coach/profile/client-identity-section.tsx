import { zodResolver } from "@hookform/resolvers/zod";
import { useCalendarDayTimeZone } from "@eli-coach-platform/ui/lib";
import { UserRound } from "lucide-react";
import { useState } from "react";
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
import { ProfileFormSection } from "~/features/client-profile/ui/shared/profile/profile-form-section";
import { useProfileSectionSave } from "~/features/client-profile/ui/shared/profile/use-profile-section-save";
import {
  clientIdentityProblemsAnswerSchema,
  clientIdentitySavedAnswerSchema,
} from "~/features/clients/public/client-identity";
import { coachClientIdentityPath } from "~/features/clients/public/paths";

type ClientIdentitySectionProps = {
  clientId: string;
  identity: ClientProfileView["identity"];
};

const GENDER_FIELDS = [IDENTITY_FIELDS.gender];

export function ClientIdentitySection({
  clientId,
  identity,
}: ClientIdentitySectionProps) {
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());
  const form = useForm<IdentityValues>({
    defaultValues: identityValues(identity),
    resolver: zodResolver(coachIdentitySchema({ now, timeZone })),
  });
  const { save, saving } = useProfileSectionSave({
    endpoint: {
      action: coachClientIdentityPath(clientId),
      problemsAnswer: clientIdentityProblemsAnswerSchema,
      savedAnswer: clientIdentitySavedAnswerSchema,
    },
    form,
    problemMessagesOf: identityProblemMessages,
  });
  const subject = subjectPronoun(identity.gender);
  const object = objectPronoun(identity.gender);

  const submit = form.handleSubmit((values) =>
    save(values, identityRequestOf(values)),
  );

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
      <ProfileFieldRows control={form.control} fields={GENDER_FIELDS} />
    </ProfileFormSection>
  );
}
