import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DetailsRequestEmailTemplate,
  type DetailsRequestEmailCopy,
  type DetailsRequestEmailViewModel,
} from "./details-request-email-template.server";

export type DetailsRequestEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type DetailsRequestEmailOptions = {
  contactEmail: string;
  currentYear: number;
  firstName: string;
  portalUrl: string;
};

const COACH_NAME = "Eli";

function detailsRequestCopy(firstName: string): DetailsRequestEmailCopy {
  return {
    body: "I've gone through your answers and need a few more details before I build your program. Open your portal and you'll see what I asked.",
    buttonLabel: "Answer now",
    greeting: `Hi ${firstName},`,
    heading: "A few more details",
    signoff: `— ${COACH_NAME}`,
    subject: `${COACH_NAME} needs a few more details`,
  };
}

export function createDetailsRequestEmailContent(
  options: DetailsRequestEmailOptions,
): DetailsRequestEmailContent {
  const viewModel: DetailsRequestEmailViewModel = {
    contactEmail: options.contactEmail,
    copy: detailsRequestCopy(options.firstName),
    currentYear: options.currentYear,
    portalUrl: options.portalUrl,
  };

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(DetailsRequestEmailTemplate, viewModel),
    )}`,
    subject: viewModel.copy.subject,
    text: renderText(viewModel),
  };
}

function renderText({
  contactEmail,
  copy,
  currentYear,
  portalUrl,
}: DetailsRequestEmailViewModel): string {
  return [
    copy.heading,
    "",
    copy.greeting,
    copy.body,
    "",
    `${copy.buttonLabel}: ${portalUrl}`,
    "",
    copy.signoff,
    "",
    `Contact: ${contactEmail}`,
    `© ${currentYear} Evoa Fitness`,
  ].join("\n");
}
