import { Button } from "@eli-coach-platform/ui/primitives";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
} from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type {
  BookAssessmentCallRequest,
  OpenSlotsResponse,
} from "~/features/assessment-calls/contracts/assessment-calls";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

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
import { CallFacts } from "./call-facts";
import { useDisplayTimeZone } from "./display-time-zone";
import { SlotCalendar } from "./slot-calendar";
import { groupSlotsByDay } from "./slot-grouping";
import { SlotList } from "./slot-list";
import { useBookAssessmentCallSubmission } from "./submission";
import { UnavailableSlots } from "./unavailable-slots";

export async function loader({ context }: LoaderFunctionArgs) {
  return context.get(assessmentCallsContext).assessmentCalls.loadBookingPage();
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
  { title: "Book a Free Assessment Call | Evoa" },
  {
    name: "description",
    content: "Book a free assessment call with Eli and start your plan.",
  },
];

type BotDetection = Awaited<ReturnType<typeof loader>>["botDetection"];

export default function AssessmentCallBookingRoute() {
  const page = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto w-full max-w-stage pb-16 pt-4">
      <div className="max-w-3xl">
        <p className="text-label font-semibold uppercase tracking-section-eyebrow text-brand-primary">
          Free assessment call
        </p>
        <h1 className="mb-6 mt-3 font-heading text-4xl leading-display-relaxed tracking-tight text-text-primary md:text-5xl">
          Start Your Plan
        </h1>
        <p className="mb-8 text-body-lg leading-copy-relaxed text-copy-muted">
          We’ll talk through your goals, your training so far and anything
          getting in the way, and I’ll show you how my coaching works so you can
          decide if it fits.
        </p>
        <CallFacts />
      </div>

      <BookingFlow
        botDetection={page.botDetection}
        initialOpenSlots={
          page.status === "open"
            ? { coachTimeZone: page.coachTimeZone, slots: page.slots }
            : null
        }
      />
    </section>
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

      const booking = {
        email: details.email,
        fullName: details.fullName,
        notes: details.notes,
        startsAt: flow.selectedSlot,
        visitorTimeZone: timeZone,
      } satisfies BookAssessmentCallRequest;
      const formData = new FormData();

      for (const [field, value] of Object.entries(booking)) {
        formData.set(field, value);
      }

      dispatch({ details, type: "submit" });
      submitFormData(formData);
    },
    [flow.selectedSlot, submitFormData, timeZone],
  );

  if (flow.step === "confirmed" && flow.booking) {
    return (
      <BookingConfirmation
        booking={flow.booking}
        timeZone={timeZone}
        visitorEmail={flow.details.email}
      />
    );
  }

  if (flow.step === "details" && flow.selectedSlot) {
    return (
      <BookingDetailsForm
        call={{ startsAt: flow.selectedSlot, timeZone }}
        enteredDetails={flow.details}
        error={flow.error}
        onBack={(details) => dispatch({ details, type: "show-slots" })}
        onSubmit={submitDetails}
        submission={submission}
      />
    );
  }

  return (
    <SlotSelectionStep
      dispatch={dispatch}
      flow={flow}
      onRetry={refresh}
      openSlots={refreshedOpenSlots ?? initialOpenSlots}
      timeZone={timeZone}
    />
  );
}

function SlotSelectionStep(props: {
  dispatch: Dispatch<BookingFlowEvent>;
  flow: BookingFlowState;
  onRetry: () => void;
  openSlots: OpenSlotsResponse | null;
  timeZone: string;
}) {
  const { dispatch, flow, onRetry, openSlots, timeZone } = props;
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
  const daySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];

  return (
    <section className="rounded-md border border-stroke-faint bg-surface-base p-6 shadow-soft md:p-10">
      <h2 className="mb-6 font-heading text-display-sm text-text-primary">
        Pick a date and time
      </h2>

      {error ? (
        <p
          className="mb-6 rounded-sm border border-feedback-danger/30 bg-feedback-danger-soft px-4 py-3 text-body-sm text-feedback-danger"
          role="alert"
        >
          {error.message}
        </p>
      ) : null}

      {openSlots ? (
        <>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <SlotCalendar
              onSelectDay={selectDay}
              selectedDayKey={selectedDayKey}
              slotsByDay={slotsByDay}
              timeZone={timeZone}
            />
            <SlotList
              daySlots={daySlots}
              onSelectSlot={(slot) => dispatch({ slot, type: "select-slot" })}
              selectedSlot={selectedSlot}
              timeZone={timeZone}
            />
          </div>

          <Button
            className="mt-10 w-full md:w-auto"
            disabled={!selectedSlot}
            onClick={() => dispatch({ type: "show-details" })}
            size="lg"
            type="button"
          >
            {selectedSlot
              ? "Continue to your details"
              : "Select a date and time"}
          </Button>
        </>
      ) : (
        <UnavailableSlots onRetry={onRetry} />
      )}
    </section>
  );
}
