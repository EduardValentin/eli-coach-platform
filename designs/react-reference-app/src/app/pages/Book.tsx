import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Clock, Video } from 'lucide-react';

import { Navbar } from '../components/Navbar';
import { LegalFooter } from '../components/legal/LegalNav';
import { AssessmentSlotPicker } from '../components/AssessmentSlotPicker';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { useAppState } from '../context/AppContext';
import { useAssessmentCalls } from '../context/AssessmentCallContext';
import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  AssessmentCallError,
  BOOKING_HORIZON_DAYS,
  bookAssessmentCall,
  listOpenSlots,
  type PrototypeBooking,
} from '../services/assessmentCallService';
import { formatCallMoment } from '../utils/dateFormatters';
import { NotFound } from './NotFound';

type Step = 'slot' | 'details' | 'success';

type FieldErrors = {
  fullName?: string;
  email?: string;
  notes?: string;
};

const SUPPORT_EMAIL = 'contact@evoa.fit';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOTES_LENGTH = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const NAME_ERROR = 'Enter your full name, between 2 and 120 characters.';
const EMAIL_ERROR = 'Enter a valid email address.';
const NOTES_ERROR = `Keep your note under ${MAX_NOTES_LENGTH} characters.`;

function validate(fullName: string, email: string, notes: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = fullName.trim();

  if (trimmedName.length < 2 || trimmedName.length > 120) {
    errors.fullName = NAME_ERROR;
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = EMAIL_ERROR;
  }
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = NOTES_ERROR;
  }

  return errors;
}

export function Book() {
  const { appState } = useAppState();
  const { bookedStarts, addBooking } = useAssessmentCalls();

  const [step, setStep] = useState<Step>('slot');
  const [slots, setSlots] = useState<Date[]>([]);
  const [retryToken, setRetryToken] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [slotTakenNotice, setSlotTakenNotice] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<AssessmentCallError | null>(
    null,
  );
  const [existingBooking, setExistingBooking] =
    useState<PrototypeBooking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<PrototypeBooking | null>(null);

  const visitorTimeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const slotsUnavailable = appState.bookingSlotsUnavailable;

  useEffect(() => {
    if (slotsUnavailable) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    listOpenSlots({ now: new Date(), bookedStarts }).then((open) => {
      if (!cancelled) setSlots(open);
    });

    return () => {
      cancelled = true;
    };
  }, [slotsUnavailable, bookedStarts, retryToken]);

  const horizonEnd = useMemo(
    () => new Date(Date.now() + BOOKING_HORIZON_DAYS * DAY_MS),
    [retryToken],
  );

  if (appState.isWaitlistMode) return <NotFound />;

  const chooseSlot = (slot: Date) => {
    setSelectedSlot(slot);
    setSlotTakenNotice(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSlot) return;

    const errors = validate(fullName, email, notes);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setExistingBooking(null);

    try {
      const confirmed = await bookAssessmentCall({
        startsAt: selectedSlot,
        fullName,
        email,
        notes,
        visitorTimeZone,
        outcome: appState.bookingOutcome,
      });
      addBooking(confirmed);
      setBooking(confirmed);
      setStep('success');
    } catch (error) {
      if (!(error instanceof AssessmentCallError)) throw error;

      if (error.code === 'SLOT_UNAVAILABLE') {
        setSelectedSlot(null);
        setSlotTakenNotice(error.message);
        setRetryToken((token) => token + 1);
        setStep('slot');
        return;
      }

      setSubmitError(error);
      setExistingBooking(error.existingBooking ?? null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="w-full min-h-screen bg-surface-page pb-24">
        <Navbar theme="dark" />

        <div className="max-w-7xl mx-auto px-6 pt-32">
          <div className="max-w-3xl">
            <p className="text-label font-semibold uppercase tracking-section-eyebrow text-brand mb-3">
              Free assessment call
            </p>
            <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-6 tracking-tight">
              Start Your Plan
            </h1>
            <p className="text-lg text-copy-muted mb-8">
              We&apos;ll talk through your goals, your training so far and
              anything getting in the way, and I&apos;ll show you how my
              coaching works so you can decide if it fits.
            </p>
            <ul className="flex flex-wrap gap-x-8 gap-y-3 text-copy-muted mb-12">
              <li className="flex items-center gap-3">
                <Clock size={18} aria-hidden="true" />
                {ASSESSMENT_CALL_DURATION_MINUTES} min call
              </li>
              <li className="flex items-center gap-3">
                <Video size={18} aria-hidden="true" />
                Video call
              </li>
            </ul>
          </div>

          {step === 'slot' && (
            <section className="bg-card border border-stroke-faint rounded-2xl shadow-sm p-6 md:p-10">
              <h2 className="font-serif text-2xl text-foreground mb-6">
                Pick a date and time
              </h2>

              {slotTakenNotice && (
                <p
                  role="alert"
                  className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                  {slotTakenNotice}
                </p>
              )}

              {slotsUnavailable ? (
                <div className="flex flex-col items-start gap-4">
                  <p className="text-copy-muted">
                    We couldn&apos;t load the open times just now.
                  </p>
                  <Button
                    type="button"
                    onClick={() => setRetryToken((token) => token + 1)}
                    className="h-12 px-8 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl font-semibold"
                  >
                    Try again
                  </Button>
                </div>
              ) : (
                <>
                  <AssessmentSlotPicker
                    slots={slots}
                    timeZone={visitorTimeZone}
                    selectedSlot={selectedSlot}
                    onSelectSlot={chooseSlot}
                    horizonEnd={horizonEnd}
                  />

                  <Button
                    type="button"
                    onClick={() => setStep('details')}
                    disabled={!selectedSlot}
                    className="w-full md:w-auto h-12 px-8 mt-10 bg-brand hover:bg-brand-hover text-brand-foreground rounded-xl text-base font-semibold disabled:bg-muted disabled:text-copy-muted"
                  >
                    {selectedSlot
                      ? 'Continue to your details'
                      : 'Select a date and time'}
                  </Button>
                </>
              )}
            </section>
          )}

          {step === 'details' && selectedSlot && (
            <section className="bg-card border border-stroke-faint rounded-2xl shadow-sm p-6 md:p-10 max-w-2xl">
              <h2 className="font-serif text-2xl text-foreground mb-2">
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
                  {existingBooking && (
                    <p className="mt-2">
                      It is on{' '}
                      {formatCallMoment(
                        existingBooking.startsAt,
                        visitorTimeZone,
                      )}
                      .{' '}
                      <Link
                        to={existingBooking.joinPath}
                        className="font-semibold underline underline-offset-2"
                      >
                        Join your call
                      </Link>
                    </p>
                  )}
                  {submitError.code === 'SERVER_ERROR' && (
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

              <form noValidate onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="booking-full-name">Full name</Label>
                  <Input
                    id="booking-full-name"
                    className="h-12"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.fullName) || undefined}
                    aria-describedby={
                      fieldErrors.fullName
                        ? 'booking-full-name-error'
                        : undefined
                    }
                  />
                  {fieldErrors.fullName && (
                    <p
                      id="booking-full-name-error"
                      className="text-sm text-destructive"
                    >
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
                    onChange={(event) => setEmail(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email) || undefined}
                    aria-describedby={
                      fieldErrors.email ? 'booking-email-error' : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <p
                      id="booking-email-error"
                      className="text-sm text-destructive"
                    >
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
                    onChange={(event) => setNotes(event.target.value)}
                    aria-invalid={Boolean(fieldErrors.notes) || undefined}
                    aria-describedby={
                      fieldErrors.notes ? 'booking-notes-error' : undefined
                    }
                  />
                  {fieldErrors.notes && (
                    <p
                      id="booking-notes-error"
                      className="text-sm text-destructive"
                    >
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
                    onClick={() => setStep('slot')}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Back to the times
                  </button>
                </div>
              </form>
            </section>
          )}

          {step === 'success' && booking && (
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
          )}
        </div>
      </main>
      <LegalFooter />
    </>
  );
}
