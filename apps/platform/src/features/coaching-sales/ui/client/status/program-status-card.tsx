import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import {
  Button,
  buttonVariants,
  InlineProblem,
} from "@eli-coach-platform/ui/primitives";
import { ClipboardList, CreditCard } from "lucide-react";
import { Link } from "react-router";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import {
  CLIENT_ANSWER_QUERY,
  CLIENT_ONBOARDING_PATH,
} from "~/features/coaching-sales/contracts/paths";
import { PaymentMethodForm } from "~/features/coaching-sales/ui/client/settings/payment-method-form";
import {
  MANAGE_PAYMENT_METHOD_LABEL,
  OPENING_PAYMENT_METHOD_LABEL,
  PAYMENT_PROBLEM_LINE,
} from "~/features/coaching-sales/ui/client/settings/subscription-copy";

import {
  ANSWER_NOW_LABEL,
  LET_ELI_START_NOW_LABEL,
  programStatusEyebrow,
  programStatusLabel,
  programStatusLine,
  START_SOONER_NOTE,
} from "./program-status-copy";
import { StartNowDialog } from "./start-now-dialog";
import { useStartNow } from "./use-start-now";

type DetailsRequest = { note: string };

type ProgramStatusCardProps = {
  status: ProgramStatus;
  detailsRequest?: DetailsRequest | null;
};

const ANSWER_PATH = `${CLIENT_ONBOARDING_PATH}?${CLIENT_ANSWER_QUERY}`;

export function ProgramStatusCard({
  status,
  detailsRequest = null,
}: ProgramStatusCardProps) {
  const timeZone = useCalendarDayTimeZone();
  const startNow = useStartNow();
  const workStartDay = status.workStartsOn
    ? formatDayMonth(status.workStartsOn, timeZone)
    : null;
  const needsDetails = status.kind === "needs-details";
  const canStartNow = status.startNowUntil !== null;
  const statusLine = programStatusLine({
    kind: status.kind,
    requestNote: detailsRequest?.note ?? null,
    workStartDay,
  });

  return (
    <div
      className="mb-8"
      data-parity="program-status"
      data-parity-root="ProgramStatusCard"
    >
      <PortalWidget
        headingId="program-status-heading"
        icon={
          <ClipboardList
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        title={
          <span data-parity="status-eyebrow">
            {programStatusEyebrow(status.kind)}
          </span>
        }
        voice={
          <span data-parity="status-label">
            {programStatusLabel(status.kind)}
          </span>
        }
      >
        {statusLine !== null && (
          <p
            className="mt-1 max-w-2xl text-sm text-text-secondary"
            data-parity="status-line"
          >
            {statusLine}
          </p>
        )}
        {canStartNow && (
          <p
            className="mt-3 max-w-2xl text-sm text-text-secondary"
            data-parity="start-sooner-note"
          >
            {START_SOONER_NOTE}
          </p>
        )}
        {status.paymentProblem && (
          <InlineProblem
            className="mt-4 max-w-2xl"
            data-parity="payment-problem"
            role="status"
          >
            {PAYMENT_PROBLEM_LINE}
          </InlineProblem>
        )}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {needsDetails && (
            <Link
              className={buttonVariants({
                size: "sm",
                variant: "primary",
                width: "full-below-sm",
              })}
              data-parity="answer-now"
              to={ANSWER_PATH}
            >
              {ANSWER_NOW_LABEL}
            </Link>
          )}
          {canStartNow && (
            <Button
              data-parity="start-now"
              disabled={startNow.dialog.starting}
              onClick={startNow.askToConfirm}
              size="sm"
              variant="outline"
              width="full-below-sm"
            >
              {LET_ELI_START_NOW_LABEL}
            </Button>
          )}
          {status.paymentProblem && (
            <PaymentMethodForm>
              {({ opening }) => (
                <Button
                  aria-busy={opening}
                  data-parity="manage-payment-method"
                  disabled={opening}
                  size="sm"
                  type="submit"
                  variant="outline"
                  width="full-below-sm"
                >
                  <CreditCard aria-hidden="true" size={16} />
                  {opening
                    ? OPENING_PAYMENT_METHOD_LABEL
                    : MANAGE_PAYMENT_METHOD_LABEL}
                </Button>
              )}
            </PaymentMethodForm>
          )}
        </div>
      </PortalWidget>
      <StartNowDialog dialog={startNow.dialog} />
    </div>
  );
}
