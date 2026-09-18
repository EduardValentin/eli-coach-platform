import { Button } from "@eli-coach-platform/ui/primitives";
import { Clock, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
  type ShouldRevalidateFunctionArgs,
} from "react-router";

import type { BookAssessmentCallRequest } from "~/features/assessment-calls/contracts/assessment-calls";
import { assessmentCallsContext } from "~/features/assessment-calls/server/guards/assessment-calls-context.server";

import { useRefreshSlotsFetcher } from "./api-client";
import { BookingConfirmation } from "./booking-confirmation";
import {
  BookingDetailsForm,
  type BookingDetails,
} from "./booking-details-form";
import { INITIAL_BOOKING_FLOW, reduceBookingFlow } from "./booking-flow";
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

type BookingPageData = Awaited<ReturnType<typeof loader>>;
type BotDetection = BookingPageData["botDetection"];
type OpenAvailability = { coachTimeZone: string; slots: readonly string[] };

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
        <ul className="mb-12 flex flex-wrap gap-x-8 gap-y-3 text-copy-muted">
          <li className="flex items-center gap-3">
            <Clock aria-hidden="true" size={18} />
            30 min call
          </li>
          <li className="flex items-center gap-3">
            <Video aria-hidden="true" size={18} />
            Video call
          </li>
        </ul>
      </div>

      <BookingFlow
        botDetection={page.botDetection}
        initialAvailability={
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
  initialAvailability: OpenAvailability | null;
}) {
  const { botDetection, initialAvailability } = props;
  const { availability: refreshedAvailability, refresh } =
    useRefreshSlotsFetcher();
  const availability = refreshedAvailability ?? initialAvailability;
  const timeZone = useDisplayTimeZone(
    initialAvailability?.coachTimeZone ?? null,
  );
  const [flow, setFlow] = useState(INITIAL_BOOKING_FLOW);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [visitorEmail, setVisitorEmail] = useState("");
  const submission = useBookAssessmentCallSubmission(botDetection);
  const { response, submitFormData } = submission;
  const openSlots = availability?.slots;
  const slotsByDay = useMemo(
    () => groupSlotsByDay(openSlots ?? [], timeZone),
    [openSlots, timeZone],
  );

  useEffect(() => {
    if (!response) {
      return;
    }

    setFlow((current) =>
      reduceBookingFlow(current, { response, type: "response" }),
    );

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

      setVisitorEmail(booking.email);
      submitFormData(formData);
    },
    [flow.selectedSlot, submitFormData, timeZone],
  );

  if (flow.step === "confirmed" && flow.booking) {
    return (
      <BookingConfirmation
        booking={flow.booking}
        timeZone={timeZone}
        visitorEmail={visitorEmail}
      />
    );
  }

  if (flow.step === "details" && flow.selectedSlot) {
    return (
      <BookingDetailsForm
        call={{ startsAt: flow.selectedSlot, timeZone }}
        error={flow.error}
        onBack={() => setFlow(reduceBookingFlow(flow, { type: "show-slots" }))}
        onSubmit={submitDetails}
        submission={submission}
      />
    );
  }

  const daySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];

  return (
    <section className="rounded-md border border-stroke-faint bg-surface-base p-6 shadow-soft md:p-10">
      <h2 className="mb-6 font-heading text-2xl leading-heading text-text-primary">
        Pick a date and time
      </h2>

      {flow.error ? (
        <p
          className="mb-6 rounded-sm border border-feedback-danger/30 bg-feedback-danger-soft px-4 py-3 text-body-sm text-feedback-danger"
          role="alert"
        >
          {flow.error.message}
        </p>
      ) : null}

      {availability ? (
        <>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <SlotCalendar
              onSelectDay={setSelectedDayKey}
              selectedDayKey={selectedDayKey}
              slotsByDay={slotsByDay}
              timeZone={timeZone}
            />
            <SlotList
              daySlots={daySlots}
              onSelectSlot={(slot) =>
                setFlow(reduceBookingFlow(flow, { slot, type: "select-slot" }))
              }
              selectedSlot={flow.selectedSlot}
              timeZone={timeZone}
            />
          </div>

          <Button
            className="mt-10 w-full md:w-auto"
            disabled={!flow.selectedSlot}
            onClick={() =>
              setFlow(reduceBookingFlow(flow, { type: "show-details" }))
            }
            size="lg"
            type="button"
          >
            {flow.selectedSlot
              ? "Continue to your details"
              : "Select a date and time"}
          </Button>
        </>
      ) : (
        <UnavailableSlots onRetry={refresh} />
      )}
    </section>
  );
}
