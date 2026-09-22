import type { AssessmentCallSnapshot } from "@eli-coach-platform/domain/assessment-call";
import { ASSESSMENT_CALL_RULES } from "@eli-coach-platform/domain/assessment-call";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { formatCallMoment } from "~/features/assessment-calls/contracts/call-moment";
import { findCountry } from "~/features/assessment-calls/contracts/countries";
import {
  formatAgeForEmail,
  labelForGender,
  labelForPrimaryGoal,
} from "~/features/assessment-calls/contracts/visitor-profile";

import { ASSESSMENT_CALL_ACTION_COPY } from "./assessment-call-email-actions.server";
import {
  CoachNotificationEmailTemplate,
  type CoachNotificationEmailViewModel,
} from "./coach-notification-email-template.server";

export type CoachNotificationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type CoachNotificationEmailOptions = {
  call: AssessmentCallSnapshot;
  googleCalendarUrl: string;
  joinUrl: string;
};

const SUBJECT_LINE = "New assessment call booked.";
const PREVIEW_TEXT = "New assessment call booked.";

export function createCoachNotificationEmailContent(
  options: CoachNotificationEmailOptions,
): CoachNotificationEmailContent {
  const viewModel = createViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(CoachNotificationEmailTemplate, viewModel),
    )}`,
    subject: SUBJECT_LINE,
    text: renderText(viewModel),
  };
}

function createViewModel(
  options: CoachNotificationEmailOptions,
): CoachNotificationEmailViewModel {
  const { call } = options;

  return {
    content: {
      eyebrow: "Assessment call — new booking",
      heading: "A new assessment call.",
      previewText: PREVIEW_TEXT,
      reassurance: "Reply to this email to reach her directly.",
      subhead: "Here is who booked it and when.",
    },
    currentYear: call.bookedAt.getUTCFullYear(),
    durationLabel: `${ASSESSMENT_CALL_RULES.durationMinutes} minutes`,
    googleCalendarUrl: options.googleCalendarUrl,
    joinUrl: options.joinUrl,
    notes: normalizeNotes(call.visitorNotes),
    profile: {
      ageLine: formatAgeForEmail({
        dateOfBirth: call.dateOfBirth,
        on: call.bookedAt,
        timeZone: call.visitorTimeZone,
      }),
      country: findCountry(call.country)?.name ?? call.country,
      gender: labelForGender(call.gender),
      phone: call.phone,
      primaryGoal: labelForPrimaryGoal(call.primaryGoal),
    },
    scheduleLine: formatCallMoment(call.startsAt, call.coachTimeZone),
    visitorEmail: call.visitorEmail,
    visitorName: call.fullName,
  };
}

function renderText(viewModel: CoachNotificationEmailViewModel): string {
  return [
    viewModel.content.heading,
    viewModel.content.subhead,
    "",
    `WHO: ${viewModel.visitorName}`,
    `EMAIL: ${viewModel.visitorEmail}`,
    ...(viewModel.profile.phone ? [`PHONE: ${viewModel.profile.phone}`] : []),
    `AGE: ${viewModel.profile.ageLine}`,
    `GENDER: ${viewModel.profile.gender}`,
    `GOAL: ${viewModel.profile.primaryGoal}`,
    `COUNTRY: ${viewModel.profile.country}`,
    `WHEN: ${viewModel.scheduleLine}`,
    `HOW LONG: ${viewModel.durationLabel}`,
    ...(viewModel.notes ? [`WHAT SHE SHARED: ${viewModel.notes}`] : []),
    "",
    `${ASSESSMENT_CALL_ACTION_COPY.joinLabel}: ${viewModel.joinUrl}`,
    `${ASSESSMENT_CALL_ACTION_COPY.calendarLabel}: ${viewModel.googleCalendarUrl}`,
    ASSESSMENT_CALL_ACTION_COPY.attachmentLine,
    "",
    viewModel.content.reassurance,
    "",
    "You received this email because someone booked a free assessment call on the Evoa site.",
    `© ${viewModel.currentYear} Evoa Fitness`,
  ].join("\n");
}

function normalizeNotes(notes: string | null): string | null {
  return notes && notes.trim().length > 0 ? notes.trim() : null;
}
