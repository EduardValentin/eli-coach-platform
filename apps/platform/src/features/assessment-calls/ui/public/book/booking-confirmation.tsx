import { buttonVariants, Link } from "@eli-coach-platform/ui/primitives";
import { Link as RouterLink } from "react-router";

import type { Booking } from "~/features/assessment-calls/contracts/assessment-calls";

import { formatCallMoment } from "~/features/assessment-calls/contracts/call-moment";

type BookingConfirmationProps = {
  booking: Booking;
  timeZone: string;
  visitorEmail: string;
};

export function BookingConfirmation(props: BookingConfirmationProps) {
  const { booking, timeZone, visitorEmail } = props;

  return (
    <section className="max-w-2xl rounded-md border border-stroke-faint bg-surface-base p-6 shadow-soft md:p-10">
      <h2 className="mb-4 font-heading text-display-sm text-text-primary">
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
        <RouterLink
          className={buttonVariants({ size: "lg", variant: "primary" })}
          to={booking.joinPath}
        >
          Join the call
        </RouterLink>
        <Link placement="standalone" to="/">
          Return to Home
        </Link>
      </div>
    </section>
  );
}
