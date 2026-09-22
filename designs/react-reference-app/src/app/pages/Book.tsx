import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Video, ChevronLeft, CircleCheck } from 'lucide-react';
import { Link } from 'react-router';

import { AssessmentSlotPicker } from '../components/AssessmentSlotPicker';
import { Navbar } from '../components/Navbar';
import { LegalFooter } from '../components/legal/LegalNav';
import { BookingDetailsStep, FIELD_IDS } from '../components/booking/BookingDetailsStep';
import { firstInvalidField, useBookingDetailsForm } from '../components/booking/useBookingDetailsForm';
import { Alert } from '../components/ui/alert';
import { Button, buttonVariants, cn } from '../components/ThemeButton';
import { Card, cardVariants } from '../components/ui/card';
import { useAppState } from '../context/AppContext';
import { useAssessmentCalls } from '../context/AssessmentCallContext';
import {
  ASSESSMENT_CALL_DURATION_MINUTES,
  AssessmentCallError,
  bookAssessmentCall,
  listOpenSlots,
  type AssessmentCallErrorCode,
  type PrototypeBooking,
} from '../services/assessmentCallService';
import { formatSlotTime, formatZonedDate } from '../utils/dateFormatters';
import { ELI_PORTRAIT_SMALL } from '../utils/eliPortrait';
import { NotFound } from './NotFound';

type Step = 'date-time' | 'details' | 'success';

const CALL_DATE_PATTERN = 'EEEE, MMMM d, yyyy';
const SUPPORT_EMAIL = 'contact@evoa.fit';
const SUPPORT_CONTACT_CODES: ReadonlySet<AssessmentCallErrorCode> = new Set([
  'booking_refused',
  'server_error',
]);

const STEP_HEADING_FOCUS_CLASS = 'scroll-mt-24 focus:outline-none';

export function Book() {
  const { appState } = useAppState();
  const { bookedStarts, addBooking, settings } = useAssessmentCalls();

  const [step, setStep] = useState<Step>('date-time');
  const [slots, setSlots] = useState<Date[]>([]);
  const [slotReloadCount, setSlotReloadCount] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [slotTakenNotice, setSlotTakenNotice] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<AssessmentCallError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [booking, setBooking] = useState<PrototypeBooking | null>(null);
  const detailsForm = useBookingDetailsForm();
  const [now] = useState(() => new Date());
  const shouldFocusStepHeading = useRef(false);

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
    listOpenSlots({ now: new Date(), bookedStarts, availability: settings }).then(
      (open) => {
        if (!cancelled) setSlots(open);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [slotsUnavailable, bookedStarts, slotReloadCount, settings]);

  const focusStepHeading = useCallback((heading: HTMLHeadingElement | null) => {
    if (!heading || !shouldFocusStepHeading.current) return;
    shouldFocusStepHeading.current = false;
    heading.focus();
  }, []);

  if (appState.isWaitlistMode) return <NotFound />;

  const goToStep = (next: Step) => {
    shouldFocusStepHeading.current = true;
    setStep(next);
  };

  const chooseSlot = (slot: Date | null) => {
    setSelectedSlot(slot);
    if (slot) setSlotTakenNotice(null);
  };

  const reloadSlots = () => setSlotReloadCount((count) => count + 1);

  const applyBookingFailure = (error: AssessmentCallError) => {
    if (error.code === 'slot_unavailable') {
      setSelectedSlot(null);
      setSlotTakenNotice(error.message);
      reloadSlots();
      goToStep('date-time');
      return;
    }

    setSubmitError(error);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSlot) return;
    const invalidField = firstInvalidField(detailsForm.validate());
    if (invalidField) {
      event.currentTarget.querySelector<HTMLElement>(`#${FIELD_IDS[invalidField]}`)?.focus();
      return;
    }
    const profile = detailsForm.validatedProfile();
    if (!profile) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const confirmed = await bookAssessmentCall(
        {
          ...profile,
          startsAt: selectedSlot,
          visitorTimeZone,
          outcome: appState.bookingOutcome,
        },
        settings,
      );
      addBooking(confirmed);
      setBooking(confirmed);
      goToStep('success');
    } catch (error) {
      if (!(error instanceof AssessmentCallError)) throw error;
      applyBookingFailure(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <main aria-label="Book a free call" className="w-full">
        <Navbar theme="dark" />

        <div className="min-h-screen bg-surface-page flex items-start justify-center pt-32 pb-12 px-4 sm:px-6 relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-brand/5 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-brand-secondary/5 blur-[100px] pointer-events-none" />

          <div className="max-w-5xl w-full bg-surface-base rounded-panel shadow-floating border border-stroke-faint flex flex-col md:flex-row overflow-hidden relative z-10 min-h-[650px]">

            <aside aria-label="About the call" className="w-full md:w-[35%] bg-surface-quiet/50 p-8 md:p-10 border-b md:border-b-0 md:border-r border-stroke-faint flex flex-col">
              <img
                src={ELI_PORTRAIT_SMALL}
                alt="Eli"
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover mb-6 shadow-card border border-control-border-soft"
              />

              <h1 className="text-sm font-semibold text-text-secondary uppercase tracking-widest mb-6">Free Call</h1>

              <div className="space-y-4 text-text-secondary mb-8 font-medium">
                <div className="flex items-center gap-3 text-md">
                  <Clock className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                  <span>{`${ASSESSMENT_CALL_DURATION_MINUTES} min session`}</span>
                </div>
                <div className="flex items-center gap-3 text-md">
                  <Video className="w-5 h-5 text-text-secondary" aria-hidden="true" />
                  <span>Google Meet (Video)</span>
                </div>
              </div>

              <p className="text-md leading-relaxed text-text-secondary font-medium">
                In this session, we'll discuss your goals, current routine, past fitness experience, and any challenges you are facing. I will also walk you through how my coaching works so we can see if it's the right fit for you.
              </p>

              {selectedSlot && step === 'details' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(cardVariants(), 'mt-8 p-4')}
                >
                  <div className="flex items-start gap-3">
                    <CalendarIcon className="w-5 h-5 text-brand mt-0.5" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-text-primary">{formatZonedDate(selectedSlot, visitorTimeZone, CALL_DATE_PATTERN)}</p>
                      <p className="text-brand font-medium">{formatSlotTime(selectedSlot, visitorTimeZone)}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </aside>

            <div className="w-full md:w-[65%] p-6 md:p-10 relative bg-surface-base flex flex-col">
              <AnimatePresence mode="wait">

                {step === 'date-time' && (
                  <motion.div
                    key="step-date"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex-1 flex flex-col"
                  >
                    <h2 ref={focusStepHeading} tabIndex={-1} className="sr-only">
                      Select a Date & Time
                    </h2>

                    {slotTakenNotice && (
                      <Alert className="mb-6">
                        <p>{slotTakenNotice}</p>
                      </Alert>
                    )}

                    {slotsUnavailable ? (
                      <>
                        <Alert>
                          <p>We couldn&apos;t load the open times just now.</p>
                        </Alert>
                        <Button onClick={reloadSlots} className="mt-6" weight="semibold" width="full">
                          Try again
                        </Button>
                      </>
                    ) : (
                      <>
                        <AssessmentSlotPicker
                          slots={slots}
                          timeZone={visitorTimeZone}
                          selectedSlot={selectedSlot}
                          onSelectSlot={chooseSlot}
                        />

                        <div className="mt-auto">
                          <Button
                            onClick={() => goToStep('details')}
                            disabled={!selectedSlot}
                            className="mt-6"
                            weight="semibold"
                            width="full"
                          >
                            {selectedSlot ? 'Continue to your details' : 'Select a date and time'}
                          </Button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.div
                    key="step-details"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col max-w-md mx-auto"
                  >
                    <button
                      type="button"
                      aria-label="Back to the times"
                      onClick={() => goToStep('date-time')}
                      className="w-10 h-10 rounded-full bg-surface-quiet hover:bg-surface-muted flex items-center justify-center text-text-secondary transition-colors mb-6 -ml-2"
                    >
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>

                    <h2 ref={focusStepHeading} tabIndex={-1} className={`text-2xl font-semibold mb-2 text-text-primary ${STEP_HEADING_FOCUS_CLASS}`}>
                      Almost there
                    </h2>
                    <p className="text-text-secondary mb-8 font-medium">Please provide your details to secure your slot.</p>

                    {submitError && (
                      <Alert className="mb-6">
                        <p>{submitError.message}</p>
                        {SUPPORT_CONTACT_CODES.has(submitError.code) && (
                          <p className="mt-2">
                            If it keeps failing, email{' '}
                            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline underline-offset-2">
                              {SUPPORT_EMAIL}
                            </a>
                            .
                          </p>
                        )}
                      </Alert>
                    )}

                    <BookingDetailsStep
                      form={detailsForm}
                      now={now}
                      isSubmitting={isSubmitting}
                      onSubmit={handleSubmit}
                    />
                  </motion.div>
                )}

                {step === 'success' && booking && (
                  <motion.div
                    key="step-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12"
                  >
                    <div className="w-20 h-20 bg-brand-soft rounded-full flex items-center justify-center mb-6">
                      <CircleCheck className="w-10 h-10 text-brand" aria-hidden="true" />
                    </div>

                    <h2 ref={focusStepHeading} tabIndex={-1} className={`text-3xl font-serif font-medium text-text-primary mb-4 ${STEP_HEADING_FOCUS_CLASS}`}>
                      You're booked!
                    </h2>
                    <p className="text-text-secondary text-lg max-w-md mx-auto mb-8 font-medium leading-relaxed">
                      A confirmation with your join link is on its way to <strong className="text-text-primary">{booking.visitorEmail}</strong>.
                    </p>

                    <Card variant="quiet" className="p-6 w-full max-w-sm mb-10 text-left">
                      <p className="text-sm text-text-secondary font-medium mb-1">When</p>
                      <p className="font-semibold text-text-primary mb-4">
                        {formatZonedDate(booking.startsAt, visitorTimeZone, CALL_DATE_PATTERN)} <br />
                        {formatSlotTime(booking.startsAt, visitorTimeZone)}
                      </p>

                      <p className="text-sm text-text-secondary font-medium mb-1">Duration</p>
                      <p className="font-semibold text-text-primary">{`${ASSESSMENT_CALL_DURATION_MINUTES} minutes`}</p>
                    </Card>

                    <Link
                      to="/"
                      className={buttonVariants({ textSize: 'sm', variant: 'outline', weight: 'semibold' })}
                    >
                      Return to Home
                    </Link>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
      <LegalFooter />
    </MotionConfig>
  );
}
