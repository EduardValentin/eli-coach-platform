import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

export type ClientPronouns = {
  subject: string;
  possessive: string;
  possessiveCapitalised: string;
  subjectHas: string;
  subjectSends: string;
};

const CLIENT_PRONOUNS: Readonly<Record<VisitorGender, ClientPronouns>> = {
  female: {
    subject: "She",
    possessive: "her",
    possessiveCapitalised: "Her",
    subjectHas: "She has",
    subjectSends: "she sends",
  },
  male: {
    subject: "He",
    possessive: "his",
    possessiveCapitalised: "His",
    subjectHas: "He has",
    subjectSends: "he sends",
  },
  prefer_not_to_say: {
    subject: "They",
    possessive: "their",
    possessiveCapitalised: "Their",
    subjectHas: "They have",
    subjectSends: "they send",
  },
};

export function clientPronouns(gender: VisitorGender): ClientPronouns {
  return CLIENT_PRONOUNS[gender];
}
