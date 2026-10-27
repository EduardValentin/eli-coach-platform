import type { ClientGender } from "~/bounded-contexts/clients/client-profile/domain/client-onboarding";

import {
  objectPronoun,
  possessivePronoun,
} from "~/bounded-contexts/scheduling/assessment-calls/public/visitor-profile";

export const PANEL_TITLE = "Onboarding";

export function answersNotInLine(gender: ClientGender): string {
  return `${possessivePronoun(gender).capitalised} answers are not in yet.`;
}

export const ANSWERS_HEADING = "Answers";

export const SCREENING_COPY = {
  needsReview: (yesCount: number) =>
    `Safety screening needs a look: ${yesCount} yes ${yesCount === 1 ? "answer" : "answers"}`,
  manual: "Safety screening: manual screening (age)",
  nutritionOnHold: "Nutrition advice on hold",
} as const;

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
  description: (gender: ClientGender) =>
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
