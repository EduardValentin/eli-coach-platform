import { buttonVariants } from "@eli-coach-platform/ui/primitives";
import { Link } from "react-router";

import type { Booking } from "~/features/assessment-calls/contracts/assessment-calls";

import { formatCallMoment } from "./slot-grouping";

type BookingConfirmationProps = {
  booking: Booking;
  timeZone: string;
  visitorEmail: string;
};

export function BookingConfirmation(props: BookingConfirmationProps) {
  const { booking, timeZone, visitorEmail } = props;

  return (
    <section className="max-w-2xl rounded-md border border-stroke-faint bg-surface-base p-6 shadow-soft md:p-10">
      <h2 className="mb-4 font-heading text-2xl leading-heading text-text-primary">
        Your call is booked
      </h2>
      <p className="mb-2 text-copy-muted">
        {formatCallMoment(new Date(booking.startsAt), timeZone)}
      </p>
      <p className="mb-2 text-copy-muted">
        The call runs {booking.durationMinutes} minutes.
      </p>
      <p className="mb-8 text-copy-muted">
        A confirmation is on its way to {visitorEmail}.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          className={buttonVariants({ size: "lg", variant: "primary" })}
          to={booking.joinPath}
        >
          Join the call
        </Link>
        <Link
          className="min-h-11 inline-flex items-center text-body-sm font-semibold text-brand-primary underline underline-offset-4 outline-none hover:no-underline focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
          to="/"
        >
          Return to Home
        </Link>
      </div>
    </section>
  );
}
