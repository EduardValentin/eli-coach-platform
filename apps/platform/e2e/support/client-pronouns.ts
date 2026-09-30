import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

export type ClientPronouns = {
  possessive: string;
  possessiveCapitalised: string;
  subjectHas: string;
  subjectSends: string;
};

const CLIENT_PRONOUNS: Readonly<Record<VisitorGender, ClientPronouns>> = {
  female: {
    possessive: "her",
    possessiveCapitalised: "Her",
    subjectHas: "She has",
    subjectSends: "she sends",
  },
  male: {
    possessive: "his",
    possessiveCapitalised: "His",
    subjectHas: "He has",
    subjectSends: "he sends",
  },
  prefer_not_to_say: {
    possessive: "their",
    possessiveCapitalised: "Their",
    subjectHas: "They have",
    subjectSends: "they send",
  },
};

export function clientPronouns(gender: VisitorGender): ClientPronouns {
  return CLIENT_PRONOUNS[gender];
}
