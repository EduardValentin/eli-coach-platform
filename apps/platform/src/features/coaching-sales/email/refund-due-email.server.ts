import type { RefundDueNotice } from "@eli-coach-platform/domain/coaching-subscription";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { formatMoney } from "~/features/coaching-sales/public/money";
import { REFUND_REASON_LABELS } from "~/features/coaching-sales/public/subscription-refunds";

import {
  REFUND_DUE_EMAIL_COPY,
  RefundDueEmailTemplate,
  type RefundDueEmailDetail,
  type RefundDueEmailViewModel,
} from "./refund-due-email-template.server";

export type RefundDueEmailContent = {
  html: string;
  subject: string;
  text: string;
};

type RefundDueEmailOptions = {
  notice: RefundDueNotice;
  clientPageUrl: string;
  currentYear: number;
};

const SUBJECT_UNSAFE_RUNS = /[\p{Cc}\s]+/gu;

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

export function createRefundDueEmailContent(
  options: RefundDueEmailOptions,
): RefundDueEmailContent {
  const viewModel = createViewModel(options);

  return {
    html: `<!doctype html>${renderToStaticMarkup(
      createElement(RefundDueEmailTemplate, viewModel),
    )}`,
    subject: viewModel.subject,
    text: renderText(viewModel),
  };
}

function createViewModel({
  notice,
  clientPageUrl,
  currentYear,
}: RefundDueEmailOptions): RefundDueEmailViewModel {
  const clientName = `${notice.client.firstName} ${notice.client.lastName}`;
  const currency = notice.paid.currency;
  const refundDue = formatMoney(notice.refund.amountCents, currency);
  const refundBy = notice.refund.dueBy
    ? DAY_MONTH.format(notice.refund.dueBy)
    : null;

  const subjectName = clientName.replace(SUBJECT_UNSAFE_RUNS, " ").trim();

  return {
    subject: refundBy
      ? `${subjectName} cancelled — refund due ${refundDue} by ${refundBy}`
      : `${subjectName} cancelled — refund due ${refundDue}`,
    details: detailsOf({ notice, clientName, refundDue, refundBy }),
    clientPageUrl,
    currentYear,
  };
}

function detailsOf(reading: {
  notice: RefundDueNotice;
  clientName: string;
  refundDue: string;
  refundBy: string | null;
}): RefundDueEmailDetail[] {
  const { notice } = reading;
  const paid = formatMoney(notice.paid.amountCents, notice.paid.currency);

  return [
    { label: "Who", value: reading.clientName },
    {
      label: "Email",
      value: notice.client.email,
      href: `mailto:${notice.client.email}`,
    },
    { label: "Refund due", value: reading.refundDue },
    ...(reading.refundBy
      ? [{ label: "Refund by", value: reading.refundBy }]
      : []),
    { label: "Why", value: REFUND_REASON_LABELS[notice.refund.reason] },
    { label: "Paid", value: `${paid} on ${DAY_MONTH.format(notice.paid.at)}` },
    { label: "Cancelled", value: DAY_MONTH.format(notice.cancelledAt) },
  ];
}

function renderText(viewModel: RefundDueEmailViewModel): string {
  return [
    REFUND_DUE_EMAIL_COPY.heading,
    REFUND_DUE_EMAIL_COPY.subhead,
    "",
    ...viewModel.details.map((detail) => `${detail.label}: ${detail.value}`),
    "",
    `${REFUND_DUE_EMAIL_COPY.buttonLabel}: ${viewModel.clientPageUrl}`,
    "",
    REFUND_DUE_EMAIL_COPY.howTo,
    "",
    REFUND_DUE_EMAIL_COPY.footer,
    `© ${viewModel.currentYear} Evoa Fitness`,
  ].join("\n");
}
