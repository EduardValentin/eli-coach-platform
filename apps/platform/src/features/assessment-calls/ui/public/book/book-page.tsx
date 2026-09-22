import { useDisplayTimeZone } from "@eli-coach-platform/ui/lib";
import { Alert, Button } from "@eli-coach-platform/ui/primitives";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type Ref,
} from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { OpenSlotsResponse } from "~/features/assessment-calls/contracts/assessment-calls";
import {
  assessmentCallsContext,
  assessmentCallsFeatureFlagEvaluationContext,
} from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

import { useRefreshSlotsFetcher } from "./api-client";
import { BookingConfirmation } from "./booking-confirmation";
import { BookingDetailsForm } from "./booking-details-form";
import {
  INITIAL_BOOKING_FLOW,
  reduceBookingFlow,
  type BookingDetails,
  type BookingFlowEvent,
  type BookingFlowState,
} from "./booking-flow";
import { CallOverview } from "./call-overview";
import { groupSlotsByDay } from "./slot-grouping";
import { SlotPicker } from "./slot-picker";
import { useStepHeadingFocus } from "./step-heading-focus";
import { useBookAssessmentCallSubmission } from "./submission";
import { UnavailableSlots } from "./unavailable-slots";
import "./book-page.css";

export async function loader({ context }: LoaderFunctionArgs) {
  return context
    .get(assessmentCallsContext)
    .assessmentCalls.loadBookingPage(
      context.get(assessmentCallsFeatureFlagEvaluationContext),
    );
}

export function shouldRevalidate({
  defaultShouldRevalidate,
  formMethod,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod) {
    return false;
  }

  return defaultShouldRevalidate;
}

export const meta: MetaFunction = () => [
  { title: "Book a Free Call | Evoa" },
  {
    name: "description",
    content: "Book a free call with Eli and start your plan.",
  },
];

export const handle = { publicContentFrame: "full-bleed" } as const;

type BotDetection = Awaited<ReturnType<typeof loader>>["botDetection"];

const STEP_TRANSITION = {
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  initial: { opacity: 0, x: 20 },
} as const;

export default function AssessmentCallBookingRoute() {
  const page = useLoaderData<typeof loader>();

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-surface-page px-4 pt-32 pb-12 sm:px-6">
        <div className="pointer-events-none absolute top-[-10%] right-[-5%] size-[600px] rounded-full bg-brand-primary/5 blur-[100px]" />
        <div className="pointer-events-none absolute bottom-[-10%] left-[-5%] size-[500px] rounded-full bg-brand-secondary/5 blur-[100px]" />

        <BookingFlow
          botDetection={page.botDetection}
          initialOpenSlots={
            page.status === "open"
              ? { coachTimeZone: page.coachTimeZone, slots: page.slots }
              : null
          }
        />
      </div>
    </MotionConfig>
  );
}

function BookingFlow(props: {
  botDetection: BotDetection;
  initialOpenSlots: OpenSlotsResponse | null;
}) {
  const { botDetection, initialOpenSlots } = props;
  const { openSlots: refreshedOpenSlots, refresh } = useRefreshSlotsFetcher();
  const timeZone = useDisplayTimeZone(initialOpenSlots?.coachTimeZone ?? null);
  const [flow, dispatch] = useReducer(reduceBookingFlow, INITIAL_BOOKING_FLOW);
  const submission = useBookAssessmentCallSubmission(botDetection);
  const { response, submitFormData } = submission;
  const stepHeadingRef = useStepHeadingFocus();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!response) {
      return;
    }

    dispatch({ response, type: "response" });

    if (!response.success && response.error.code === "slot_unavailable") {
      refresh();
    }
  }, [refresh, response]);

  const submitDetails = useCallback(
    (details: BookingDetails) => {
      if (!flow.selectedSlot) {
        return;
      }

      const booking: Record<string, string> = {
        country: details.country,
        dateOfBirth: details.dateOfBirth,
        email: details.email,
        firstName: details.firstName,
        gender: details.gender,
        lastName: details.lastName,
        notes: details.notes,
        phoneCountry: details.phoneCountry,
        phoneNumber: details.phoneNumber,
        primaryGoal: details.primaryGoal,
        startsAt: flow.selectedSlot,
        visitorTimeZone: timeZone,
      };
      const formData = new FormData();

      for (const [field, value] of Object.entries(booking)) {
        formData.set(field, value);
      }

      dispatch({ details, type: "submit" });
      submitFormData(formData);
    },
    [flow.selectedSlot, submitFormData, timeZone],
  );

  const chosenCall =
    flow.step === "details" && flow.selectedSlot
      ? { startsAt: flow.selectedSlot, timeZone }
      : null;

  return (
    <div className="relative z-10 flex min-h-[650px] w-full max-w-5xl flex-col overflow-hidden rounded-panel border border-stroke-faint bg-surface-base shadow-floating md:flex-row">
      <CallOverview chosenCall={chosenCall} />

      <div className="ui-booking-first-step-entrance relative flex w-full flex-col bg-surface-base p-6 md:w-[65%] md:p-10">
        <AnimatePresence mode="wait">
          {flow.step === "slot" ? (
            <motion.div
              className="flex flex-1 flex-col"
              key="step-slot"
              {...STEP_TRANSITION}
              initial={hasMounted ? STEP_TRANSITION.initial : false}
            >
              <SlotSelectionStep
                dispatch={dispatch}
                flow={flow}
                headingRef={stepHeadingRef}
                onRetry={refresh}
                openSlots={refreshedOpenSlots ?? initialOpenSlots}
                timeZone={timeZone}
              />
            </motion.div>
          ) : null}

          {flow.step === "details" && flow.selectedSlot ? (
            <motion.div
              className="mx-auto flex h-full max-w-md flex-col"
              key="step-details"
              {...STEP_TRANSITION}
            >
              <BookingDetailsForm
                enteredDetails={flow.details}
                error={flow.error}
                headingRef={stepHeadingRef}
                onBack={(details) => dispatch({ details, type: "show-slots" })}
                onSubmit={submitDetails}
                submission={submission}
                timeZone={timeZone}
              />
            </motion.div>
          ) : null}

          {flow.step === "confirmed" && flow.booking ? (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center py-12 text-center"
              data-parity-root="BookingConfirmation"
              initial={{ opacity: 0, scale: 0.95 }}
              key="step-confirmed"
            >
              <BookingConfirmation
                booking={flow.booking}
                headingRef={stepHeadingRef}
                timeZone={timeZone}
                visitorEmail={flow.details.email}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SlotSelectionStep(props: {
  dispatch: Dispatch<BookingFlowEvent>;
  flow: BookingFlowState;
  headingRef: Ref<HTMLHeadingElement>;
  onRetry: () => void;
  openSlots: OpenSlotsResponse | null;
  timeZone: string;
}) {
  const { dispatch, flow, headingRef, onRetry, openSlots, timeZone } = props;
  const { error, selectedDayKey, selectedSlot } = flow;
  const slots = openSlots?.slots;
  const slotsByDay = useMemo(
    () => groupSlotsByDay(slots ?? [], timeZone),
    [slots, timeZone],
  );
  const selectDay = useCallback(
    (dayKey: string | null) => dispatch({ dayKey, type: "select-day" }),
    [dispatch],
  );

  return (
    <>
      <h2 className="sr-only" ref={headingRef} tabIndex={-1}>
        Select a Date &amp; Time
      </h2>

      {error ? (
        <Alert className="mb-6">
          <p>{error.message}</p>
        </Alert>
      ) : null}

      {openSlots ? (
        <>
          <SlotPicker
            onSelectDay={selectDay}
            onSelectSlot={(slot) => dispatch({ slot, type: "select-slot" })}
            selectedDayKey={selectedDayKey}
            selectedSlot={selectedSlot}
            slotsByDay={slotsByDay}
            timeZone={timeZone}
          />

          <div className="mt-auto">
            <Button
              className="mt-6"
              disabled={!selectedSlot}
              weight="semibold"
              width="full"
              onClick={() => dispatch({ type: "show-details" })}
              type="button"
            >
              {selectedSlot
                ? "Continue to your details"
                : "Select a date and time"}
            </Button>
          </div>
        </>
      ) : (
        <UnavailableSlots onRetry={onRetry} />
      )}
    </>
  );
}
