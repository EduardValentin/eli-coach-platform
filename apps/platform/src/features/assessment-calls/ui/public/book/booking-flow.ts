import type {
  BookAssessmentCallResponse,
  Booking,
} from "~/features/assessment-calls/contracts/assessment-calls";

export type BookingClientError = Extract<
  BookAssessmentCallResponse,
  { success: false }
>["error"];

export type BookingDetails = {
  country: string;
  dateOfBirth: string;
  email: string;
  firstName: string;
  gender: string;
  lastName: string;
  notes: string;
  phoneCountry: string;
  phoneCountryChosen: boolean;
  phoneNumber: string;
  primaryGoal: string;
};

const EMPTY_BOOKING_DETAILS: BookingDetails = {
  country: "",
  dateOfBirth: "",
  email: "",
  firstName: "",
  gender: "",
  lastName: "",
  notes: "",
  phoneCountry: "",
  phoneCountryChosen: false,
  phoneNumber: "",
  primaryGoal: "",
};

export type BookingFlowState = {
  booking: Booking | null;
  details: BookingDetails;
  error: BookingClientError | null;
  selectedDayKey: string | null;
  selectedSlot: string | null;
  step: "slot" | "details" | "confirmed";
};

export type BookingFlowEvent =
  | { dayKey: string | null; type: "select-day" }
  | { slot: string; type: "select-slot" }
  | { type: "show-details" }
  | { details: BookingDetails; type: "show-slots" }
  | { details: BookingDetails; type: "submit" }
  | { response: BookAssessmentCallResponse; type: "response" };

export const INITIAL_BOOKING_FLOW: BookingFlowState = {
  booking: null,
  details: EMPTY_BOOKING_DETAILS,
  error: null,
  selectedDayKey: null,
  selectedSlot: null,
  step: "slot",
};

export function reduceBookingFlow(
  state: BookingFlowState,
  event: BookingFlowEvent,
): BookingFlowState {
  switch (event.type) {
    case "select-day":
      return { ...state, selectedDayKey: event.dayKey, selectedSlot: null };

    case "select-slot":
      return { ...state, error: null, selectedSlot: event.slot };

    case "show-details":
      return state.selectedSlot
        ? { ...state, error: null, step: "details" }
        : state;

    case "show-slots":
      return { ...state, details: event.details, error: null, step: "slot" };

    case "submit":
      return { ...state, details: event.details };

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
      selectedDayKey: null,
      selectedSlot: null,
      step: "slot",
    };
  }

  return { ...state, error: response.error };
}
