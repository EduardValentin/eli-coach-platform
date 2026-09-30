import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

export type ClientPronouns = {
  possessive: string;
  possessiveCapitalised: string;
  subjectHas: string;
};

const CLIENT_PRONOUNS: Readonly<Record<VisitorGender, ClientPronouns>> = {
  female: {
    possessive: "her",
    possessiveCapitalised: "Her",
    subjectHas: "She has",
  },
  male: {
    possessive: "his",
    possessiveCapitalised: "His",
    subjectHas: "He has",
  },
  prefer_not_to_say: {
    possessive: "their",
    possessiveCapitalised: "Their",
    subjectHas: "They have",
  },
};

export function clientPronouns(gender: VisitorGender): ClientPronouns {
  return CLIENT_PRONOUNS[gender];
}
