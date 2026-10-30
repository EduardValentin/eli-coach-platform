import { zodResolver } from "@hookform/resolvers/zod";
import { useCalendarDayTimeZone } from "~/shared/design-system/lib";
import { User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { OwnClientProfileView } from "~/bounded-contexts/clients/client-profile/public/own-client-profile";
import {
  identityProblemMessages,
  identityRequestOf,
  identityValues,
  ownIdentitySchema,
  type IdentityValues,
} from "~/bounded-contexts/clients/client-profile/ui/shared/profile/identity-form";
import { IdentityFields } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/identity-fields";
import { ProfileFormSection } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/profile-form-section";
import { useProfileSectionSave } from "~/bounded-contexts/clients/client-profile/ui/shared/profile/use-profile-section-save";
import {
  clientIdentityProblemsAnswerSchema,
  clientIdentitySavedAnswerSchema,
  type OwnClientIdentityRequest,
} from "~/bounded-contexts/clients/clients/public/client-identity";
import { CLIENTS_API_PATHS } from "~/bounded-contexts/clients/clients/public/paths";

type AboutYouFormProps = {
  identity: OwnClientProfileView["identity"];
};

const EMAIL_COPY = {
  description: "How you sign in.",
  hint: "You sign in and pay with this address, so it can't be changed.",
};

function ownIdentityRequestOf(
  values: IdentityValues,
): OwnClientIdentityRequest {
  const request = identityRequestOf(values);

  return {
    firstName: request.firstName,
    lastName: request.lastName,
    dateOfBirth: request.dateOfBirth,
    country: request.country,
    phoneCountry: request.phoneCountry,
    phoneNumber: request.phoneNumber,
  };
}

export function AboutYouForm({ identity }: AboutYouFormProps) {
  const timeZone = useCalendarDayTimeZone();
  const [now] = useState(() => new Date());
  const form = useForm<IdentityValues>({
    defaultValues: identityValues(identity),
    resolver: zodResolver(ownIdentitySchema({ now, timeZone })),
  });
  const { save, saving } = useProfileSectionSave({
    endpoint: {
      action: CLIENTS_API_PATHS.ownIdentity,
      problemsAnswer: clientIdentityProblemsAnswerSchema,
      savedAnswer: clientIdentitySavedAnswerSchema,
    },
    form,
    problemMessagesOf: identityProblemMessages,
  });

  const submit = form.handleSubmit((values) =>
    save(values, ownIdentityRequestOf(values)),
  );

  return (
    <ProfileFormSection
      heading={{
        description: "Who you are and how your coach reaches you.",
        icon: User,
        id: "about-you-heading",
        title: "About you",
      }}
      parityRoot="ClientProfileAbout"
      submission={{ changed: form.formState.isDirty, onSubmit: submit, saving }}
    >
      <IdentityFields
        control={form.control}
        email={{ address: identity.email, ...EMAIL_COPY }}
        idPrefix="profile"
      />
    </ProfileFormSection>
  );
}
