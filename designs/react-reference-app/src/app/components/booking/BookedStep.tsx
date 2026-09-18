import { Link } from 'react-router';

import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  type PrototypeBooking,
} from '../../services/assessmentCallService';
import { formatCallMoment } from '../../utils/dateFormatters';

type BookedStepProps = {
  booking: PrototypeBooking;
  visitorTimeZone: string;
};

export function BookedStep({ booking, visitorTimeZone }: BookedStepProps) {
  return (
    <section className="bg-card border border-stroke-faint rounded-2xl shadow-sm p-6 md:p-10 max-w-2xl">
      <h2 className="font-serif text-2xl text-foreground mb-4">
        Your call is booked
      </h2>
      <p className="text-copy-muted mb-2">
        {formatCallMoment(booking.startsAt, visitorTimeZone)}
      </p>
      <p className="text-copy-muted mb-2">
        The call runs {ASSESSMENT_CALL_DURATION_MINUTES} minutes.
      </p>
      <p className="text-copy-muted mb-8">
        A confirmation is on its way to {booking.visitorEmail}.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <Link
          to={booking.joinPath}
          className="inline-flex items-center justify-center h-12 px-8 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl font-semibold transition-colors"
        >
          Join the call
        </Link>
        <Link
          to="/"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Return to Home
        </Link>
      </div>
    </section>
  );
}
