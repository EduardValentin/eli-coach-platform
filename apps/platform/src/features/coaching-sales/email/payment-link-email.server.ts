import {
  COACHING_BUNDLES,
  type CoachingBundle,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { formatEuros } from "~/features/coaching-sales/contracts/bundle-cards";

import {
  PAYMENT_LINK_EMAIL_SUBSCRIPTION_NOTE,
  PaymentLinkEmailTemplate,
  type PaymentLinkEmailBundleViewModel,
  type PaymentLinkEmailViewModel,
} from "./payment-link-email-template.server";

export type PaymentLinkEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type PaymentLinkEmailOptions = {
  chooseUrl: string;
  contactEmail: string;
  currentYear: number;
  firstName: string;
  termsUrl: string;
  tier: PriceTier;
};

type PaymentLinkVariantCopy = {
  previewText: string;
  heading: string;
  subhead: string;
  opening: string;
};

const COPY: Record<PriceTier, PaymentLinkVariantCopy> = {
  regular: {
    previewText: "Your coaching bundles — pick the one that fits.",
    heading: "Let's get you started.",
    subhead:
      "Three ways to work together. Pick the one that fits your months ahead.",
    opening:
      "It was good to talk to you. Here are the three bundles we went through, so you can take your time and choose.",
  },
  reduced: {
    previewText: "Your reduced prices are ready.",
    heading: "Let's get you started.",
    subhead: "These are your reduced prices, held for you.",
    opening:
      "It was good to talk to you. I've put your reduced pricing on all three bundles below, so you can take your time and choose.",
  },
};

export function createPaymentLinkEmailContent(
  options: PaymentLinkEmailOptions,
): PaymentLinkEmailContent {
  const viewModel = createViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(PaymentLinkEmailTemplate, viewModel),
    )}`,
    subject: COPY[options.tier].previewText,
    text: renderText(viewModel),
  };
}

function createViewModel(
  options: PaymentLinkEmailOptions,
): PaymentLinkEmailViewModel {
  const copy = COPY[options.tier];

  return {
    bundles: COACHING_BUNDLES.map((bundle) =>
      toBundleViewModel(bundle, options.tier),
    ),
    chooseUrl: options.chooseUrl,
    contactEmail: options.contactEmail,
    content: {
      heading: copy.heading,
      opening: copy.opening,
      previewText: copy.previewText,
      subhead: copy.subhead,
    },
    currentYear: options.currentYear,
    firstName: options.firstName,
    termsUrl: options.termsUrl,
  };
}

function toBundleViewModel(
  bundle: CoachingBundle,
  tier: PriceTier,
): PaymentLinkEmailBundleViewModel {
  return {
    lengthLabel: bundleLengthLabel(bundle.months),
    perMonth: formatEuros(bundle.perMonth(tier)),
    total: formatEuros(bundle.total(tier)),
  };
}

function bundleLengthLabel(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}

function renderText(viewModel: PaymentLinkEmailViewModel): string {
  return [
    viewModel.content.heading,
    viewModel.content.subhead,
    "",
    `Hi ${viewModel.firstName},`,
    viewModel.content.opening,
    "",
    ...viewModel.bundles.map(
      (bundle) =>
        `${bundle.lengthLabel}: ${bundle.perMonth} per month, ${bundle.total} in total`,
    ),
    "",
    `Choose your bundle: ${viewModel.chooseUrl}`,
    `${PAYMENT_LINK_EMAIL_SUBSCRIPTION_NOTE} Read the terms: ${viewModel.termsUrl}`,
    "",
    `Questions? Reply to this email or write to ${viewModel.contactEmail}.`,
    "",
    "You received this email because you had an assessment call with Eli.",
    `© ${viewModel.currentYear} Evoa Fitness`,
  ].join("\n");
}
