import type { ProgramStatusKind } from "~/features/coaching-sales/public/client-journey";

const ONBOARDING_EYEBROW = "Your onboarding";
const PROGRAM_EYEBROW = "Your program";

const EYEBROWS: Readonly<Record<ProgramStatusKind, string>> = {
  submitted: ONBOARDING_EYEBROW,
  "in-review": ONBOARDING_EYEBROW,
  "needs-details": ONBOARDING_EYEBROW,
  approved: PROGRAM_EYEBROW,
};

const LABELS: Readonly<Record<ProgramStatusKind, string>> = {
  submitted: "Sent to your coach",
  "in-review": "Your coach is reviewing your answers",
  "needs-details": "Your coach needs a few more details",
  approved: "Your answers are approved",
};

type AnswersWithCoachKind = Exclude<ProgramStatusKind, "needs-details">;

const SUPPORTING_LINES: Readonly<Record<AnswersWithCoachKind, string>> = {
  submitted: "Eli has your answers and will start on them soon.",
  "in-review":
    "You'll see the next step here as soon as she has looked through your answers.",
  approved: "Eli is putting your program together.",
};

export const ANSWER_NOW_LABEL = "Answer now";

export type ProgramStatusMoment = {
  kind: ProgramStatusKind;
  requestNote: string | null;
  workStartDay: string | null;
};

export function programStatusEyebrow(kind: ProgramStatusKind): string {
  return EYEBROWS[kind];
}

export function programStatusLabel(kind: ProgramStatusKind): string {
  return LABELS[kind];
}

export function programStatusLine(moment: ProgramStatusMoment): string | null {
  if (moment.kind === "needs-details") {
    return moment.requestNote;
  }

  if (moment.workStartDay) {
    return `Eli has your answers. You chose to keep your 14-day right of withdrawal, so she starts working on your program on ${moment.workStartDay}. Your program will be delivered as soon as it is completed.`;
  }

  return SUPPORTING_LINES[moment.kind];
}

export const START_SOONER_NOTE =
  "Want Eli to start sooner? You can give up your 14-day right of withdrawal and let her begin now.";

export const LET_ELI_START_NOW_LABEL = "Let Eli start now";

export const START_NOW_TITLE = "Let Eli start now?";

export const KEEP_MY_14_DAYS_LABEL = "Keep my 14 days";

export const YES_START_NOW_LABEL = "Yes, start now";

export const START_NOW_PROBLEM =
  "Your program couldn't be started just now. Nothing has changed, so please try again.";
