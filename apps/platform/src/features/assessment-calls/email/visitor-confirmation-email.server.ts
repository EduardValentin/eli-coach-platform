import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/assessment-call";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { formatCallMoment } from "~/features/assessment-calls/contracts/call-moment";

import { ASSESSMENT_CALL_ACTION_COPY } from "./assessment-call-email-actions.server";
import {
  VisitorConfirmationEmailTemplate,
  type VisitorConfirmationEmailViewModel,
} from "./visitor-confirmation-email-template.server";

export type VisitorConfirmationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type VisitorConfirmationEmailOptions = {
  call: AssessmentCallSnapshot;
  contactEmail: string;
  googleCalendarUrl: string;
  joinUrl: string;
};

const SUBJECT_LINE = "Your free assessment call is booked.";
const PREVIEW_TEXT = "Your free assessment call is booked.";
const WHERE_LINE = "A video call — the link is right below.";

export function createVisitorConfirmationEmailContent(
  options: VisitorConfirmationEmailOptions,
): VisitorConfirmationEmailContent {
  const viewModel = createViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(VisitorConfirmationEmailTemplate, viewModel),
    )}`,
    subject: SUBJECT_LINE,
    text: renderText(viewModel),
  };
}

function createViewModel(
  options: VisitorConfirmationEmailOptions,
): VisitorConfirmationEmailViewModel {
  const { call } = options;

  return {
    contactEmail: options.contactEmail,
    content: {
      eyebrow: "Assessment call — confirmed",
      heading: "Your call is booked.",
      letterParagraphs: [
        `Hi ${call.visitorName},`,
        "We'll talk through your goals, your training so far and anything getting in the way — and I'll show you how my coaching works, so you can decide whether it fits.",
      ],
      previewText: PREVIEW_TEXT,
      reassurance:
        "Something came up? Reply to this email and we'll find another time.",
      subhead: "Everything you need for it is in this email.",
    },
    currentYear: call.bookedAt.getUTCFullYear(),
    durationLabel: `${ASSESSMENT_CALL_RULES.durationMinutes} minutes`,
    googleCalendarUrl: options.googleCalendarUrl,
    joinUrl: options.joinUrl,
    notes: normalizeNotes(call.visitorNotes),
    scheduleLine: formatCallMoment(call.startsAt, call.visitorTimeZone),
    visitorEmail: call.visitorEmail,
  };
}

function renderText(viewModel: VisitorConfirmationEmailViewModel): string {
  return [
    viewModel.content.heading,
    viewModel.content.subhead,
    "",
    ...viewModel.content.letterParagraphs,
    "",
    `WHEN: ${viewModel.scheduleLine}`,
    `HOW LONG: ${viewModel.durationLabel}`,
    `WHERE: ${WHERE_LINE}`,
    ...(viewModel.notes ? [`WHAT YOU SHARED: ${viewModel.notes}`] : []),
    "",
    `${ASSESSMENT_CALL_ACTION_COPY.joinLabel}: ${viewModel.joinUrl}`,
    `${ASSESSMENT_CALL_ACTION_COPY.calendarLabel}: ${viewModel.googleCalendarUrl}`,
    ASSESSMENT_CALL_ACTION_COPY.attachmentLine,
    "",
    viewModel.content.reassurance,
    `This confirmation went to ${viewModel.visitorEmail}. You can also write to ${viewModel.contactEmail}.`,
    "",
    "You received this email because you booked a free assessment call with Eli.",
    `© ${viewModel.currentYear} Evoa Fitness`,
  ].join("\n");
}

function normalizeNotes(notes: string | null): string | null {
  return notes && notes.trim().length > 0 ? notes.trim() : null;
}
