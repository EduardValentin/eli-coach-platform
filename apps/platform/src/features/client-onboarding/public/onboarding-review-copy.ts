import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";

import {
  objectPronoun,
  possessivePronoun,
} from "~/features/assessment-calls/public/visitor-profile";

export const PANEL_TITLE = "Onboarding";

export function answersNotInLine(gender: VisitorGender): string {
  return `${possessivePronoun(gender).capitalised} answers are not in yet.`;
}

export const ANSWERS_HEADING = "Answers";

export const SCREENING_COPY = {
  needsReview: (yesCount: number) =>
    `Safety screening needs a look: ${yesCount} yes ${yesCount === 1 ? "answer" : "answers"}`,
  manual: "Safety screening: manual screening (age)",
  nutritionOnHold: "Nutrition advice on hold",
} as const;

export const FACT_LABELS = {
  ratio: "Waist-to-height ratio",
  checkInDay: "Check-in day",
  channel: "Channel",
  cycleMode: "Cycle mode",
} as const;

export const CYCLE_MODE_LABELS = {
  "phase-based": "Phase-based",
  "symptom-based": "Symptom-based",
  manual: "Set by Eli",
} as const;

export const CYCLE_MODE_NOT_ANSWERED = "Not answered yet";

export const CYCLE_MODE_INFO_LABEL = "What cycle mode means";

type CycleModeDefinition = {
  readonly meaning: string;
  readonly term: string;
};

export const CYCLE_MODE_DEFINITIONS: readonly CycleModeDefinition[] = [
  {
    term: CYCLE_MODE_LABELS["phase-based"],
    meaning:
      "her program follows her cycle phases: she gets a period, is not on the combined pill, is not pregnant, postpartum or breastfeeding, and is not in perimenopause or menopause.",
  },
  {
    term: CYCLE_MODE_LABELS["symptom-based"],
    meaning:
      "one of those does not hold, so her program follows the symptoms she reports.",
  },
  {
    term: CYCLE_MODE_LABELS.manual,
    meaning:
      "her contraception is one the product does not classify; you decide how her program adapts.",
  },
  {
    term: CYCLE_MODE_NOT_ANSWERED,
    meaning: "the cycle form is empty.",
  },
];

export const RATIO_HIDDEN_NOTE =
  "Not shown during pregnancy or right after birth.";

export function ratioWaitingLine(gender: VisitorGender): string {
  return `Waiting on ${possessivePronoun(gender).lower} first measurements`;
}

export const NOT_CHOSEN_YET = "Not chosen yet";

export const NOT_ANSWERED = "Not answered";

export const NEEDS_A_LOOK = "Needs a look";

export const ASKED_AGAIN = "Asked again";

export function askedAgainCount(count: number): string {
  return `${count} asked again`;
}

export function answeredCount(answered: number, total: number): string {
  return `${answered} of ${total} answered`;
}

export function waitingLine(count: number, askedDay: string): string {
  return `Waiting on ${count} ${count === 1 ? "answer" : "answers"} · asked ${askedDay}`;
}

export const REVIEW_ACTIONS = {
  "awaiting-review": "Review answers",
  "in-review": "Continue review",
} as const;

export const APPROVE_ACTION = "Approve answers";

export const REVIEW_DIALOG = {
  title: (firstName: string) => `Review ${firstName}’s answers`,
  description: (gender: VisitorGender) =>
    `Tick any answer you want ${objectPronoun(gender)} to revisit, then approve or ask for more details.`,
  flagLabel: "Flag",
  noteLabel: "What is missing?",
  cancel: "Cancel",
  askForDetails: "Ask for more details",
  approve: APPROVE_ACTION,
} as const;

export function flaggedCount(count: number): string {
  return count === 1 ? "1 question flagged" : `${count} questions flagged`;
}

export const APPROVE_CONFIRM = {
  title: (firstName: string) => `Approve ${firstName}'s answers?`,
  description: "You won't be able to ask for more details once you approve.",
  confirm: "Approve",
} as const;

export function emailSentToast(email: string): string {
  return `Email sent to ${email}.`;
}

export const REVIEW_ACTION_FAILED =
  "That did not go through just now. Try again in a moment.";

export const ANSWER_REQUEST_COPY = {
  eyebrow: "Your onboarding",
  title: "A few more details",
  heading: "What your coach asked",
  notNow: "Not now",
  send: "Send my answers",
  sending: "Sending…",
  sendProblem:
    "Your answers could not be sent just now. Try again in a moment.",
} as const;
