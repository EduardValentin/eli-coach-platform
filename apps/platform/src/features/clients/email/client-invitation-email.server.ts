import { COACH_DISPLAY_NAME } from "@eli-coach-platform/content";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ClientInvitationEmailTemplate,
  stepNumber,
  type ClientInvitationEmailCopy,
  type ClientInvitationEmailViewModel,
} from "./client-invitation-email-template.server";

export type ClientInvitationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type ClientInvitationEmailOptions = {
  acceptUrl: string;
  contactEmail: string;
  currentYear: number;
  firstName: string;
};

function invitationCopy(firstName: string): ClientInvitationEmailCopy {
  return {
    buttonLabel: "Create your account",
    eyebrow: "Invitation — 1-on-1 coaching",
    footer: `You received this email because ${COACH_DISPLAY_NAME} invited you to 1-on-1 coaching.`,
    greeting: `Hi ${firstName},`,
    heading: "Your place is booked.",
    letter: [
      "Thank you — your place in my coaching is booked. Create your account from the button below; it takes a minute. Then you'll answer a short form about you, and I'll build your program from your answers.",
      "This link works for the next 30 days. You have to create your account from it — reading this email isn't enough. If it runs out, tell me and I'll send you a new one.",
    ],
    nextSteps: [
      "Create your account from the button above.",
      "Answer a short form about your goals, your health and your day-to-day.",
      "I build your program, and you'll find it right here in your account.",
    ],
    nextStepsTitle: "What happens next",
    previewText: "Your place is booked — create your account.",
    reassurance:
      "This is your personal invitation — please don't forward it. It belongs to your email address alone.",
    signoff: `— ${COACH_DISPLAY_NAME}`,
    subhead: "Let's get you set up.",
  };
}

export function createClientInvitationEmailContent(
  options: ClientInvitationEmailOptions,
): ClientInvitationEmailContent {
  const viewModel: ClientInvitationEmailViewModel = {
    acceptUrl: options.acceptUrl,
    contactEmail: options.contactEmail,
    copy: invitationCopy(options.firstName),
    currentYear: options.currentYear,
  };

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(ClientInvitationEmailTemplate, viewModel),
    )}`,
    subject: viewModel.copy.previewText,
    text: renderText(viewModel),
  };
}

function renderText({
  acceptUrl,
  contactEmail,
  copy,
  currentYear,
}: ClientInvitationEmailViewModel): string {
  return [
    copy.heading,
    copy.subhead,
    "",
    copy.greeting,
    ...copy.letter,
    copy.signoff,
    "",
    `${copy.buttonLabel}: ${acceptUrl}`,
    "",
    copy.nextStepsTitle,
    ...copy.nextSteps.map((step, index) => `${stepNumber(index)} ${step}`),
    "",
    copy.reassurance,
    `Questions? Reply to this email or write to ${contactEmail}.`,
    "",
    copy.footer,
    `© ${currentYear} Evoa Fitness`,
  ].join("\n");
}
