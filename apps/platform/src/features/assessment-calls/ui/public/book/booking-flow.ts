import type {
  BookAssessmentCallResponse,
  Booking,
} from "~/features/assessment-calls/contracts/assessment-calls";

export type BookingClientError = Extract<
  BookAssessmentCallResponse,
  { success: false }
>["error"];

export type BookingFlowState = {
  booking: Booking | null;
  error: BookingClientError | null;
  selectedDayKey: string | null;
  selectedSlot: string | null;
  step: "slot" | "details" | "confirmed";
  visitorEmail: string;
};

export type BookingFlowEvent =
  | { dayKey: string | null; type: "select-day" }
  | { slot: string; type: "select-slot" }
  | { type: "show-details" }
  | { type: "show-slots" }
  | { email: string; type: "submit" }
  | { response: BookAssessmentCallResponse; type: "response" };

export const INITIAL_BOOKING_FLOW: BookingFlowState = {
  booking: null,
  error: null,
  selectedDayKey: null,
  selectedSlot: null,
  step: "slot",
  visitorEmail: "",
};

export function reduceBookingFlow(
  state: BookingFlowState,
  event: BookingFlowEvent,
): BookingFlowState {
  switch (event.type) {
    case "select-day":
      return { ...state, selectedDayKey: event.dayKey };

    case "select-slot":
      return { ...state, error: null, selectedSlot: event.slot };

    case "show-details":
      return state.selectedSlot
        ? { ...state, error: null, step: "details" }
        : state;

    case "show-slots":
      return { ...state, error: null, step: "slot" };

    case "submit":
      return { ...state, visitorEmail: event.email };

    case "response":
      return resolveBookingState(state, event.response);
  }
}

function resolveBookingState(
  state: BookingFlowState,
  response: BookAssessmentCallResponse,
): BookingFlowState {
  if (response.success) {
    return {
      ...state,
      booking: response.booking,
      error: null,
      step: "confirmed",
    };
  }

  if (response.error.code === "slot_unavailable") {
    return {
      ...state,
      error: response.error,
      selectedSlot: null,
      step: "slot",
    };
  }

  return { ...state, error: response.error };
}
