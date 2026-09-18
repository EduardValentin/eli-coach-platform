import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Video } from 'lucide-react';

import { Navbar } from '../components/Navbar';
import { LegalFooter } from '../components/legal/LegalNav';
import { BookedStep } from '../components/booking/BookedStep';
import { DetailsStep } from '../components/booking/DetailsStep';
import { SlotStep } from '../components/booking/SlotStep';
import { useBookingDetailsForm } from '../components/booking/useBookingDetailsForm';
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
import { NotFound } from './NotFound';

type Step = 'slot' | 'details' | 'success';

const DAY_MS = 24 * 60 * 60 * 1000;

export function Book() {
  const { appState } = useAppState();
  const { bookedStarts, addBooking } = useAssessmentCalls();

  const [step, setStep] = useState<Step>('slot');
  const [slots, setSlots] = useState<Date[]>([]);
  const [slotReloadCount, setSlotReloadCount] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [slotTakenNotice, setSlotTakenNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<AssessmentCallError | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<PrototypeBooking | null>(null);
  const detailsForm = useBookingDetailsForm();
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const renderedStep = useRef<Step>(step);

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
  }, [slotsUnavailable, bookedStarts, slotReloadCount]);

  useEffect(() => {
    if (renderedStep.current === step) return;
    renderedStep.current = step;
    stepHeadingRef.current?.focus();
  }, [step]);

  const now = useMemo(() => new Date(), []);
  const horizonEnd = useMemo(
    () => new Date(now.getTime() + BOOKING_HORIZON_DAYS * DAY_MS),
    [now],
  );

  if (appState.isWaitlistMode) return <NotFound />;

  const chooseSlot = (slot: Date) => {
    setSelectedSlot(slot);
    setSlotTakenNotice(null);
  };

  const reloadSlots = () => setSlotReloadCount((count) => count + 1);

  const applyBookingFailure = (error: AssessmentCallError) => {
    if (error.code === 'slot_unavailable') {
      setSelectedSlot(null);
      setSlotTakenNotice(error.message);
      reloadSlots();
      setStep('slot');
      return;
    }

    setSubmitError(error);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedSlot) return;
    if (!detailsForm.validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const confirmed = await bookAssessmentCall({
        startsAt: selectedSlot,
        fullName: detailsForm.fullName,
        email: detailsForm.email,
        notes: detailsForm.notes,
        visitorTimeZone,
        outcome: appState.bookingOutcome,
      });
      addBooking(confirmed);
      setBooking(confirmed);
      setStep('success');
    } catch (error) {
      if (!(error instanceof AssessmentCallError)) throw error;
      applyBookingFailure(error);
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
            <SlotStep
              headingRef={stepHeadingRef}
              slots={slots}
              visitorTimeZone={visitorTimeZone}
              selectedSlot={selectedSlot}
              horizonEnd={horizonEnd}
              slotTakenNotice={slotTakenNotice}
              slotsUnavailable={slotsUnavailable}
              onSelectSlot={chooseSlot}
              onReloadSlots={reloadSlots}
              onContinue={() => setStep('details')}
            />
          )}

          {step === 'details' && selectedSlot && (
            <DetailsStep
              headingRef={stepHeadingRef}
              selectedSlot={selectedSlot}
              visitorTimeZone={visitorTimeZone}
              form={detailsForm}
              submitError={submitError}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              onBack={() => setStep('slot')}
            />
          )}

          {step === 'success' && booking && (
            <BookedStep
              headingRef={stepHeadingRef}
              booking={booking}
              visitorTimeZone={visitorTimeZone}
            />
          )}
        </div>
      </main>
      <LegalFooter />
    </>
  );
}
