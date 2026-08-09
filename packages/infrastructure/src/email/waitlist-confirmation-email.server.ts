import type {
  WaitlistOffer,
  WaitlistSignupPricing,
} from "@eli-coach-platform/domain";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  WaitlistConfirmationEmailTemplate,
  type WaitlistConfirmationEmailViewModel,
} from "./waitlist-confirmation-email-template.server";

export type WaitlistConfirmationEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type WaitlistConfirmationEmailOptions = {
  contactEmail: string;
  currentYear?: number;
  offer: WaitlistOffer;
  pricing: WaitlistSignupPricing;
  privacyEmail: string;
};

const waitlistConfirmationSubject = "You're on the Eli waitlist";

const copy: Record<
  WaitlistSignupPricing,
  WaitlistConfirmationEmailViewModel["content"]
> = {
  reduced: {
    bodyParagraphs: [
      "Hi there,",
      "Thanks for jumping on the waitlist. I keep this round small on purpose — only a handful of women, so I can actually be there for each of you.",
      "Here's what happens next: when spots open, you'll hear from me with the link, reduced pricing on every plan, reserved only for early signups, and everything you need to decide if we're a fit. No pressure either way.",
      "If you've got questions in the meantime, hit reply. I read every message.",
      "— Eli",
    ],
    eyebrow: "Waitlist — confirmed",
    heading: "You're in.",
    previewText: "You're on the list — I'll be in touch when doors open.",
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    subhead: "You'll be the first to know when doors open.",
  },
  regular: {
    bodyParagraphs: [
      "Hi there,",
      "You're on the Evoa Fitness waitlist.",
      "Reduced-price spots were already full when you joined.",
      "This signup does not include reduced pricing.",
      "We'll let you know when coaching availability opens. If you've got questions in the meantime, hit reply. I read every message.",
      "— Eli",
    ],
    eyebrow: "Waitlist — confirmed",
    heading: "You're on the waitlist.",
    previewText:
      "You joined the waitlist successfully. Reduced-price spots were full.",
    reassurance:
      "We'll send only the waitlist and marketing topics you agreed to when you joined.",
    subhead:
      "You joined successfully. Reduced-price spots were already full.",
  },
};

const expectations = [
  "A plan built around your cycle, not against it.",
  "Strength training and nutrition that actually go together.",
  "1-on-1 coaching — not a generic PDF program.",
];

export function createWaitlistConfirmationEmailContent(
  options: WaitlistConfirmationEmailOptions,
): WaitlistConfirmationEmailContent {
  const viewModel = createWaitlistConfirmationEmailViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(WaitlistConfirmationEmailTemplate, viewModel),
    )}`,
    subject: waitlistConfirmationSubject,
    text: renderWaitlistConfirmationText(viewModel),
  };
}

function createWaitlistConfirmationEmailViewModel(
  options: WaitlistConfirmationEmailOptions,
): WaitlistConfirmationEmailViewModel {
  return {
    contactEmail: options.contactEmail,
    content: copy[options.pricing],
    currentYear: options.currentYear ?? new Date().getFullYear(),
    expectations,
    planLabel: resolveWaitlistOfferPlanLabel(options.offer),
    unsubscribeUrl: createUnsubscribeMailto(options.privacyEmail),
  };
}

function renderWaitlistConfirmationText(
  viewModel: WaitlistConfirmationEmailViewModel,
): string {
  return [
    waitlistConfirmationSubject,
    "",
    viewModel.content.heading,
    viewModel.content.subhead,
    "",
    `Plan: ${viewModel.planLabel}`,
    "",
    ...viewModel.content.bodyParagraphs,
    "",
    "What you can expect:",
    ...viewModel.expectations.map(
      (expectation, index) => `${index + 1}. ${expectation}`,
    ),
    "",
    viewModel.content.reassurance,
    `Questions? Reply to this email or write to ${viewModel.contactEmail}.`,
    "",
    "You received this email because you joined the waitlist for Eli's coaching program.",
    `Unsubscribe: ${viewModel.unsubscribeUrl}`,
    `Contact: mailto:${viewModel.contactEmail}`,
    `© ${viewModel.currentYear} Eli Personal Trainer`,
  ].join("\n");
}

function createUnsubscribeMailto(privacyEmail: string): string {
  const subject = encodeURIComponent(
    "Unsubscribe from Eli waitlist emails",
  );

  return `mailto:${privacyEmail}?subject=${subject}`;
}

function resolveWaitlistOfferPlanLabel(offer: WaitlistOffer): string {
  const planLabels = {
    "all-bundles": "Every coaching plan",
  } satisfies Record<WaitlistOffer["plan"], string>;

  return planLabels[offer.plan];
}
