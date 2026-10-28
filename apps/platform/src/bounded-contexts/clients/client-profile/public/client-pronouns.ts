import type { ClientGender } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";

type PossessivePronoun = {
  readonly capitalised: string;
  readonly lower: string;
};

type SubjectPronoun = {
  readonly capitalised: string;
  readonly hasVerb: string;
  readonly isVerb: string;
  readonly lower: string;
  readonly regularVerbSuffix: string;
};

const POSSESSIVE_PRONOUNS: Readonly<Record<ClientGender, PossessivePronoun>> = {
  female: { capitalised: "Her", lower: "her" },
  male: { capitalised: "His", lower: "his" },
  prefer_not_to_say: { capitalised: "Their", lower: "their" },
};

const SUBJECT_PRONOUNS: Readonly<Record<ClientGender, SubjectPronoun>> = {
  female: {
    capitalised: "She",
    hasVerb: "has",
    isVerb: "is",
    lower: "she",
    regularVerbSuffix: "s",
  },
  male: {
    capitalised: "He",
    hasVerb: "has",
    isVerb: "is",
    lower: "he",
    regularVerbSuffix: "s",
  },
  prefer_not_to_say: {
    capitalised: "They",
    hasVerb: "have",
    isVerb: "are",
    lower: "they",
    regularVerbSuffix: "",
  },
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
