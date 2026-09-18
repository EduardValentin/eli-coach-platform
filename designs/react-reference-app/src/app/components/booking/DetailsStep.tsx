import type { RefObject } from 'react';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import type { BookingDetailsForm } from './useBookingDetailsForm';
import {
  AssessmentCallError,
  type AssessmentCallErrorCode,
} from '../../services/assessmentCallService';
import { formatCallMoment } from '../../utils/dateFormatters';

type DetailsStepProps = {
  headingRef: RefObject<HTMLHeadingElement>;
  selectedSlot: Date;
  visitorTimeZone: string;
  form: BookingDetailsForm;
  submitError: AssessmentCallError | null;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onBack: () => void;
};

const SUPPORT_EMAIL = 'contact@evoa.fit';

const SUPPORT_CONTACT_CODES: ReadonlySet<AssessmentCallErrorCode> = new Set([
  'booking_refused',
  'server_error',
]);

export function DetailsStep({
  headingRef,
  selectedSlot,
  visitorTimeZone,
  form,
  submitError,
  isSubmitting,
  onSubmit,
  onBack,
}: DetailsStepProps) {
  const { fullName, email, notes, fieldErrors } = form;

  return (
    <section className="bg-card border border-stroke-faint rounded-2xl shadow-sm p-6 md:p-10 max-w-2xl">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-2xl text-foreground mb-2 scroll-mt-24 focus:outline-none"
      >
        Your details
      </h2>
      <p className="text-copy-muted mb-8">
        Your call: {formatCallMoment(selectedSlot, visitorTimeZone)}
      </p>

      {submitError && (
        <div
          role="alert"
          className="mb-8 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <p>{submitError.message}</p>
          {SUPPORT_CONTACT_CODES.has(submitError.code) && (
            <p className="mt-2">
              If it keeps failing, email{' '}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold underline underline-offset-2"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          )}
        </div>
      )}

      <form noValidate onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="booking-full-name">Full name</Label>
          <Input
            id="booking-full-name"
            className="h-12"
            value={fullName}
            onChange={(event) => form.setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.fullName) || undefined}
            aria-describedby={
              fieldErrors.fullName ? 'booking-full-name-error' : undefined
            }
          />
          {fieldErrors.fullName && (
            <p id="booking-full-name-error" className="text-sm text-destructive">
              {fieldErrors.fullName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-email">Email address</Label>
          <Input
            id="booking-email"
            type="email"
            className="h-12"
            value={email}
            onChange={(event) => form.setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email) || undefined}
            aria-describedby={
              fieldErrors.email ? 'booking-email-error' : undefined
            }
          />
          {fieldErrors.email && (
            <p id="booking-email-error" className="text-sm text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-notes">
            Anything to share beforehand? (Optional)
          </Label>
          <Textarea
            id="booking-notes"
            className="h-28 resize-none"
            value={notes}
            onChange={(event) => form.setNotes(event.target.value)}
            aria-invalid={Boolean(fieldErrors.notes) || undefined}
            aria-describedby={
              fieldErrors.notes ? 'booking-notes-error' : undefined
            }
          />
          {fieldErrors.notes && (
            <p id="booking-notes-error" className="text-sm text-destructive">
              {fieldErrors.notes}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting || undefined}
            className="h-12 px-8 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl text-base font-semibold disabled:opacity-70"
          >
            Book my call
          </Button>
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-semibold text-brand hover:underline"
          >
            Back to the times
          </button>
        </div>
      </form>
    </section>
  );
}
