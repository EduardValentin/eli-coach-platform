import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "@eli-coach-platform/ui/lib";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { ClipboardList } from "lucide-react";
import { Link } from "react-router";

import type { ProgramStatus } from "~/features/coaching-sales/contracts/client-journey";
import {
  CLIENT_ANSWER_QUERY,
  CLIENT_ONBOARDING_PATH,
} from "~/features/coaching-sales/contracts/paths";

import {
  ANSWER_NOW_LABEL,
  programStatusEyebrow,
  programStatusLabel,
  programStatusLine,
} from "./program-status-copy";

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
  const workStartDay = status.workStartsOn
    ? formatDayMonth(status.workStartsOn, timeZone)
    : null;
  const needsDetails = status.kind === "needs-details";
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
        </div>
      </PortalWidget>
    </div>
  );
}
