import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { cn } from "@eli-coach-platform/ui/lib";
import { CircleCheck } from "lucide-react";
import type { Ref } from "react";
import { Link as RouterLink } from "react-router";

import type { Booking } from "~/features/assessment-calls/contracts/assessment-calls";

import {
  formatCallDate,
  formatSlotTime,
  nameTimeZone,
} from "~/features/assessment-calls/contracts/call-moment";

type BookingConfirmationProps = {
  booking: Booking;
  headingRef: Ref<HTMLHeadingElement>;
  timeZone: string;
  visitorEmail: string;
};

export function BookingConfirmation(props: BookingConfirmationProps) {
  const { booking, headingRef, timeZone, visitorEmail } = props;
  const startsAt = new Date(booking.startsAt);

  return (
    <>
      <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-brand-primary-soft">
        <CircleCheck
          aria-hidden="true"
          className="size-10 text-brand-primary"
        />
      </div>

      <h2
        className="mb-4 scroll-mt-24 font-heading text-3xl font-medium text-text-primary"
        ref={headingRef}
        tabIndex={-1}
      >
        You&apos;re booked!
      </h2>
      <p className="mx-auto mb-8 max-w-md text-lg leading-relaxed font-medium text-text-secondary">
        A confirmation with your join link is on its way to{" "}
        <strong className="text-text-strong">{visitorEmail}</strong>.
      </p>

      <div className="mb-10 w-full max-w-sm rounded-2xl border border-stroke-faint bg-surface-quiet p-6 text-left">
        <p className="mb-1 text-sm font-medium text-text-secondary">When</p>
        <p className="mb-4 font-semibold text-text-primary">
          {formatCallDate(startsAt, timeZone)} <br />
          {`${formatSlotTime(startsAt, timeZone)} (${nameTimeZone(startsAt, timeZone)})`}
        </p>

        <p className="mb-1 text-sm font-medium text-text-secondary">Duration</p>
        <p className="font-semibold text-text-primary">
          {`${booking.durationMinutes} minutes`}
        </p>
      </div>

      <RouterLink
        className={cn(
          buttonVariants({ label: "compact", variant: "outline" }),
          "px-8",
        )}
        to="/"
      >
        Return to Home
      </RouterLink>
    </>
  );
}
