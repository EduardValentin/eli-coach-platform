import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ClientInvitationEmailTemplate,
  type ClientInvitationVariant,
} from "./client-invitation-email-template.server";

export type ClientInvitationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type ClientInvitationEmailOptions = {
  acceptUrl: string;
  coachName: string;
  contactEmail: string;
  currentYear?: number;
  firstName: string;
  variant: ClientInvitationVariant;
};

const SUBJECT: Record<ClientInvitationVariant, string> = {
  first: "Your coaching profile is ready",
  replaced: "Your new invitation link",
};

export function createClientInvitationEmailContent(
  options: ClientInvitationEmailOptions,
): ClientInvitationEmailContent {
  const currentYear = options.currentYear ?? new Date().getUTCFullYear();

  const html = renderToStaticMarkup(
    createElement(ClientInvitationEmailTemplate, {
      acceptUrl: options.acceptUrl,
      coachName: options.coachName,
      contactEmail: options.contactEmail,
      currentYear,
      firstName: options.firstName,
      variant: options.variant,
    }),
  );

  return {
    html: `<!DOCTYPE html>${html}`,
    subject: SUBJECT[options.variant],
    text: createPlainText({ ...options, currentYear }),
  };
}

// A plain-text part is not optional: a client that cannot render the HTML would
// otherwise receive an invitation with no link in it.
function createPlainText(
  options: ClientInvitationEmailOptions & { currentYear: number },
): string {
  const opening =
    options.variant === "replaced"
      ? "I made some changes to your profile and sent this fresh invitation. Use the link below — the one from my earlier email no longer works."
      : "I've set up your profile, your starting targets and your first goal. You just need to accept the invitation below.";

  return [
    `Hi ${options.firstName},`,
    "",
    opening,
    "",
    `Accept your invitation: ${options.acceptUrl}`,
    "",
    "This invitation works for the next 30 days. If it runs out, tell me and I'll send you a new one.",
    "",
    "What happens next:",
    "01 Tap the link and sign in with the code I email you.",
    "02 Answer a few questions — your cycle, your food preferences, anything I should know.",
    "03 Your targets and my notes are waiting in your portal.",
    "",
    "This is your personal invitation — please don't forward it. It works once, on the first account that opens it.",
    "",
    `Questions? Reply to this email or write to ${options.contactEmail}.`,
    "",
    `— ${options.coachName}`,
    `© ${options.currentYear} Evoa Fitness`,
  ].join("\n");
}
