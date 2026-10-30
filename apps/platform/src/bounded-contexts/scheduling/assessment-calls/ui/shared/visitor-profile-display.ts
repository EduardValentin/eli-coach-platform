import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";

export {
  checkBirthDate,
  formatAgeForCard,
  labelForGender,
  labelForPrimaryGoal,
  normalizeVisitorPhone,
  VISITOR_GENDER_OPTIONS,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";

export type PossessivePronoun = {
  readonly capitalised: string;
  readonly lower: string;
};

const POSSESSIVE_PRONOUNS: Readonly<Record<VisitorGender, PossessivePronoun>> =
  {
    female: { capitalised: "Her", lower: "her" },
    male: { capitalised: "His", lower: "his" },
    prefer_not_to_say: { capitalised: "Their", lower: "their" },
  };

export function possessivePronoun(gender: VisitorGender): PossessivePronoun {
  return POSSESSIVE_PRONOUNS[gender];
}

type SubjectPronoun = {
  readonly capitalised: string;
  readonly hasVerb: string;
  readonly isVerb: string;
  readonly lower: string;
  readonly regularVerbSuffix: string;
};

const SUBJECT_PRONOUNS: Readonly<Record<VisitorGender, SubjectPronoun>> = {
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

export function subjectPronoun(gender: VisitorGender): SubjectPronoun {
  return SUBJECT_PRONOUNS[gender];
}

const OBJECT_PRONOUNS: Readonly<Record<VisitorGender, string>> = {
  female: "her",
  male: "him",
  prefer_not_to_say: "them",
};

export function objectPronoun(gender: VisitorGender): string {
  return OBJECT_PRONOUNS[gender];
}
