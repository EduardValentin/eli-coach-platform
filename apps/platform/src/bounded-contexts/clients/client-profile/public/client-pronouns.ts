import type { ClientGender } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";

type PossessivePronoun = { readonly capitalised: string };

type SubjectPronoun = {
  readonly capitalised: string;
  readonly hasVerb: string;
};

const POSSESSIVE_PRONOUNS: Readonly<Record<ClientGender, PossessivePronoun>> = {
  female: { capitalised: "Her" },
  male: { capitalised: "His" },
  prefer_not_to_say: { capitalised: "Their" },
};

const SUBJECT_PRONOUNS: Readonly<Record<ClientGender, SubjectPronoun>> = {
  female: { capitalised: "She", hasVerb: "has" },
  male: { capitalised: "He", hasVerb: "has" },
  prefer_not_to_say: { capitalised: "They", hasVerb: "have" },
};

const OBJECT_PRONOUNS: Readonly<Record<ClientGender, string>> = {
  female: "her",
  male: "him",
  prefer_not_to_say: "them",
};

export function possessivePronoun(gender: ClientGender): PossessivePronoun {
  return POSSESSIVE_PRONOUNS[gender];
}

export function subjectPronoun(gender: ClientGender): SubjectPronoun {
  return SUBJECT_PRONOUNS[gender];
}

export function objectPronoun(gender: ClientGender): string {
  return OBJECT_PRONOUNS[gender];
}
