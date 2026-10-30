import type { VisitorGender } from "~/bounded-contexts/scheduling/public/visitor";

export type ClientPronouns = {
  subject: string;
  object: string;
  possessive: string;
  possessiveCapitalised: string;
  subjectHas: string;
  subjectSends: string;
};

const CLIENT_PRONOUNS: Readonly<Record<VisitorGender, ClientPronouns>> = {
  female: {
    subject: "She",
    object: "her",
    possessive: "her",
    possessiveCapitalised: "Her",
    subjectHas: "She has",
    subjectSends: "she sends",
  },
  male: {
    subject: "He",
    object: "him",
    possessive: "his",
    possessiveCapitalised: "His",
    subjectHas: "He has",
    subjectSends: "he sends",
  },
  prefer_not_to_say: {
    subject: "They",
    object: "them",
    possessive: "their",
    possessiveCapitalised: "Their",
    subjectHas: "They have",
    subjectSends: "they send",
  },
};

export function clientPronouns(gender: VisitorGender): ClientPronouns {
  return CLIENT_PRONOUNS[gender];
}
