import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  StoreDeliveryEmailTemplate,
  type StoreDeliveryEmailViewModel,
} from "./store-delivery-email-template.server";

export type StoreDeliveryEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type StoreDeliveryEmailResource = {
  title: string;
  typeLabels: readonly string[];
};

type StoreDeliveryEmailOptions = {
  contactEmail: string;
  currentYear: number;
  downloadUrl: string;
  resources: readonly StoreDeliveryEmailResource[];
};

export function createStoreDeliveryEmailContent(
  options: StoreDeliveryEmailOptions,
): StoreDeliveryEmailContent {
  const viewModel = createStoreDeliveryEmailViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(StoreDeliveryEmailTemplate, viewModel),
    )}`,
    subject: viewModel.copy.subject,
    text: [
      viewModel.copy.heading,
      viewModel.copy.subhead,
      "",
      ...viewModel.copy.bodyParagraphs,
      "",
      "What's inside:",
      ...viewModel.resources.map(
        (resource) => `- ${resource.title} — ${resource.typeLabel}`,
      ),
      "",
      `${viewModel.copy.buttonLabel}: ${viewModel.downloadUrl}`,
      "",
      "This is a delivery email for the resources you requested — no marketing, just your download.",
      `Questions? Reply to this email or write to ${viewModel.contactEmail}.`,
      `© ${viewModel.currentYear} Evoa Fitness`,
    ].join("\n"),
  };
}

function createStoreDeliveryEmailViewModel(
  options: StoreDeliveryEmailOptions,
): StoreDeliveryEmailViewModel {
  return {
    ...options,
    copy: createStoreDeliveryCopy(options.resources.length),
    resources: options.resources.map((resource) => ({
      title: resource.title,
      typeLabel: formatTypeLabels(resource.typeLabels),
    })),
  };
}

function createStoreDeliveryCopy(
  resourceCount: number,
): StoreDeliveryEmailViewModel["copy"] {
  if (resourceCount === 1) {
    return {
      bodyParagraphs: [
        "Hi there,",
        "Thanks for requesting this guide from the store. Tap the button below and your download starts right away.",
        "The link works for the next seven days. If it expires, you can request the same guide again from the store.",
        "— Eli",
      ],
      buttonLabel: "Download your guide",
      heading: "Your guide is ready.",
      previewText: "Your guide is ready — the download is inside.",
      subject: "Your guide is ready",
      subhead: "One tap and it starts downloading.",
    };
  }

  return {
    bodyParagraphs: [
      "Hi there,",
      "Thanks for requesting these resources from the store. Tap the button below and your download starts right away — everything arrives together in one ZIP file.",
      "The link works for the next seven days. If it expires, you can request the same resources again from the store.",
      "— Eli",
    ],
    buttonLabel: "Download your resources",
    heading: "Your resources are ready.",
    previewText: "Your resources are ready — the download is inside.",
    subject: "Your resources are ready",
    subhead: "Everything you picked, in one download.",
  };
}

function formatTypeLabels(typeLabels: readonly string[]): string {
  return typeLabels.length > 0 ? typeLabels.join(" · ") : "Free resource";
}
