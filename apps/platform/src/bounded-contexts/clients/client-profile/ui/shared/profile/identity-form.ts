import type { ClientIdentityProblems } from "~/bounded-contexts/clients/clients/domain/client";
import { z } from "zod";

import {
  COUNTRIES,
  findCountry,
} from "~/bounded-contexts/scheduling/assessment-calls/public/countries";
import {
  checkBirthDate,
  MIN_BOOKING_AGE,
  normalizeVisitorPhone,
  VISITOR_GENDER_OPTIONS,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";
import type { ClientProfileView } from "~/bounded-contexts/clients/client-profile/public/client-profile";

import {
  lengthProblemMessage,
  MAX_PROFILE_NAME_LENGTH,
  profileFieldSchema,
  type ProfileField,
} from "./profile-fields";

export type IdentityValues = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  phoneCountry: string;
  phoneNumber: string;
  gender: string;
};

type IdentityMoment = { now: Date; timeZone: string };

type ProfileIdentity = ClientProfileView["identity"];

export const IDENTITY_FIELDS = {
  firstName: {
    id: "firstName",
    label: "First name",
    kind: "text",
    requirement: "required",
    maxLength: MAX_PROFILE_NAME_LENGTH,
  },
  lastName: {
    id: "lastName",
    label: "Last name",
    kind: "text",
    requirement: "required",
    maxLength: MAX_PROFILE_NAME_LENGTH,
  },
  country: {
    id: "country",
    label: "Country",
    kind: "select",
    requirement: "required",
    options: COUNTRIES.map((country) => ({
      value: country.code,
      label: country.name,
    })),
  },
  gender: {
    id: "gender",
    label: "Gender",
    kind: "radio",
    requirement: "required",
    options: VISITOR_GENDER_OPTIONS,
  },
} as const satisfies Record<string, ProfileField>;

const IDENTITY_PROBLEMS = {
  dateOfBirthMissing: "Choose a date of birth.",
  dateOfBirthTooYoung: `Choose a date at least ${MIN_BOOKING_AGE} years ago.`,
  dateOfBirthImpossible: "Enter a real date of birth.",
  phone:
    "Enter a phone number with digits only, 4 to 14 digits after the country code.",
  name: "Enter an answer.",
  country: "Choose one option.",
} as const;

function dateOfBirthProblem(
  dateOfBirth: string,
  moment: IdentityMoment,
): string | null {
  if (dateOfBirth.length === 0) return IDENTITY_PROBLEMS.dateOfBirthMissing;

  const check = checkBirthDate({
    dateOfBirth,
    on: moment.now,
    timeZone: moment.timeZone,
  });

  if (check === "too_young") return IDENTITY_PROBLEMS.dateOfBirthTooYoung;
  if (check === "impossible") return IDENTITY_PROBLEMS.dateOfBirthImpossible;

  return null;
}

function phoneProblem(values: IdentityValues): string | null {
  const phone = normalizeVisitorPhone({
    country: values.phoneCountry,
    nationalNumber: values.phoneNumber,
  });

  return phone.status === "invalid" ? IDENTITY_PROBLEMS.phone : null;
}

const identityShape = {
  firstName: profileFieldSchema(IDENTITY_FIELDS.firstName),
  lastName: profileFieldSchema(IDENTITY_FIELDS.lastName),
  dateOfBirth: z.string(),
  country: profileFieldSchema(IDENTITY_FIELDS.country),
  phoneCountry: z.string(),
  phoneNumber: z.string(),
  gender: z.string(),
};

function withIdentityRules(
  schema: z.ZodType<IdentityValues, IdentityValues>,
  moment: IdentityMoment,
) {
  return schema.superRefine((values, context) => {
    const birth = dateOfBirthProblem(values.dateOfBirth, moment);
    const phone = phoneProblem(values);

    if (birth) {
      context.addIssue({
        code: "custom",
        message: birth,
        path: ["dateOfBirth"],
      });
    }

    if (phone) {
      context.addIssue({
        code: "custom",
        message: phone,
        path: ["phoneNumber"],
      });
    }
  });
}

export function coachIdentitySchema(moment: IdentityMoment) {
  return withIdentityRules(
    z.object({
      ...identityShape,
      gender: profileFieldSchema(IDENTITY_FIELDS.gender),
    }),
    moment,
  );
}

export function ownIdentitySchema(moment: IdentityMoment) {
  return withIdentityRules(z.object(identityShape), moment);
}

function phoneCountryOf(identity: ProfileIdentity): string {
  const { phone } = identity;

  if (!phone) return identity.country;

  const dialled = COUNTRIES.filter((country) =>
    phone.startsWith(country.callingCode),
  ).sort((a, b) => b.callingCode.length - a.callingCode.length);
  const longest = dialled[0]?.callingCode;
  const matching = dialled.filter((country) => country.callingCode === longest);

  return (
    matching.find((country) => country.code === identity.country)?.code ??
    matching[0]?.code ??
    identity.country
  );
}

function nationalNumberOf(identity: ProfileIdentity, phoneCountry: string) {
  const callingCode = findCountry(phoneCountry)?.callingCode ?? "";

  return identity.phone?.startsWith(callingCode)
    ? identity.phone.slice(callingCode.length)
    : "";
}

export function identityValues(identity: ProfileIdentity): IdentityValues {
  const phoneCountry = phoneCountryOf(identity);

  return {
    firstName: identity.firstName,
    lastName: identity.lastName,
    dateOfBirth: identity.dateOfBirth,
    country: identity.country,
    phoneCountry,
    phoneNumber: nationalNumberOf(identity, phoneCountry),
    gender: identity.gender,
  };
}

export function identityRequestOf(values: IdentityValues): IdentityValues {
  return {
    ...values,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
  };
}

type IdentityProblemMessage = {
  field: keyof IdentityValues;
  message: string;
};

const NAME_PROBLEMS = {
  missing: IDENTITY_PROBLEMS.name,
  "too-long": lengthProblemMessage(MAX_PROFILE_NAME_LENGTH),
} as const;

const DATE_OF_BIRTH_PROBLEMS = {
  impossible: IDENTITY_PROBLEMS.dateOfBirthImpossible,
  "too-young": IDENTITY_PROBLEMS.dateOfBirthTooYoung,
} as const;

export function identityProblemMessages(
  problems: ClientIdentityProblems,
): IdentityProblemMessage[] {
  const messages: (IdentityProblemMessage | null)[] = [
    problems.firstName
      ? { field: "firstName", message: NAME_PROBLEMS[problems.firstName] }
      : null,
    problems.lastName
      ? { field: "lastName", message: NAME_PROBLEMS[problems.lastName] }
      : null,
    problems.dateOfBirth
      ? {
          field: "dateOfBirth",
          message: DATE_OF_BIRTH_PROBLEMS[problems.dateOfBirth],
        }
      : null,
    problems.phone
      ? { field: "phoneNumber", message: IDENTITY_PROBLEMS.phone }
      : null,
    problems.country
      ? { field: "country", message: IDENTITY_PROBLEMS.country }
      : null,
  ];

  return messages.filter(
    (message): message is IdentityProblemMessage => message !== null,
  );
}
