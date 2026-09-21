import { describe, expect, it } from "vitest";

import type { BookAssessmentCallResponse } from "~/features/assessment-calls/contracts/assessment-calls";

import {
  INITIAL_BOOKING_FLOW,
  reduceBookingFlow,
  type BookingFlowState,
} from "./booking-flow";

const FIRST_SLOT = "2026-03-02T15:00:00.000Z";
const SECOND_SLOT = "2026-03-02T16:00:00.000Z";
const FIRST_DAY = "2026-03-02";
const DETAILS = {
  country: "RO",
  dateOfBirth: "1994-03-14",
  email: "jane@example.com",
  firstName: "Jane",
  gender: "female",
  lastName: "Doe",
  notes: "Knee injury last year",
  phoneCountry: "RO",
  phoneNumber: "0712 345 678",
  primaryGoal: "build_strength",
};

const CONFIRMED: BookAssessmentCallResponse = {
  booking: {
    durationMinutes: 30,
    id: "2b0f2d2e-6f52-4a2e-9a19-1a1b4b1a6f11",
    startsAt: FIRST_SLOT,
    visitorTimeZone: "Europe/Bucharest",
  },
  success: true,
};

describe("assessment call booking flow", () => {
  it("starts on the slot step with nothing chosen", () => {
    // arrange
    // act
    const state = INITIAL_BOOKING_FLOW;

    // assert
    expect(state).toEqual({
      booking: null,
      details: {
        country: "",
        dateOfBirth: "",
        email: "",
        firstName: "",
        gender: "",
        lastName: "",
        notes: "",
        phoneCountry: "",
        phoneNumber: "",
        primaryGoal: "",
      },
      error: null,
      selectedDayKey: null,
      selectedSlot: null,
      step: "slot",
    });
  });

  it("remembers the day the visitor opened", () => {
    // arrange
    // act
    const state = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
      dayKey: FIRST_DAY,
      type: "select-day",
    });

    // assert
    expect(state).toMatchObject({ selectedDayKey: FIRST_DAY, step: "slot" });
  });

  it("closes the day when the visitor clears it", () => {
    // arrange
    const opened = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
      dayKey: FIRST_DAY,
      type: "select-day",
    });

    // act
    const state = reduceBookingFlow(opened, {
      dayKey: null,
      type: "select-day",
    });

    // assert
    expect(state.selectedDayKey).toBeNull();
  });

  it("forgets the chosen time when the visitor opens another day", () => {
    // arrange
    const timeChosen = reduceBookingFlow(
      reduceBookingFlow(INITIAL_BOOKING_FLOW, {
        dayKey: FIRST_DAY,
        type: "select-day",
      }),
      { slot: FIRST_SLOT, type: "select-slot" },
    );

    // act
    const state = reduceBookingFlow(timeChosen, {
      dayKey: "2026-03-03",
      type: "select-day",
    });

    // assert
    expect(state).toMatchObject({
      selectedDayKey: "2026-03-03",
      selectedSlot: null,
    });
  });

  it("remembers the details the booking was sent with", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, {
      details: DETAILS,
      type: "submit",
    });

    // assert
    expect(state).toMatchObject({
      details: DETAILS,
      selectedSlot: FIRST_SLOT,
      step: "details",
    });
  });

  it("remembers the time the visitor chose", () => {
    // arrange
    // act
    const state = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
      slot: FIRST_SLOT,
      type: "select-slot",
    });

    // assert
    expect(state.selectedSlot).toBe(FIRST_SLOT);
    expect(state.step).toBe("slot");
  });

  it("moves on to the details once a time is chosen", () => {
    // arrange
    const chosen = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
      slot: FIRST_SLOT,
      type: "select-slot",
    });

    // act
    const state = reduceBookingFlow(chosen, { type: "show-details" });

    // assert
    expect(state.step).toBe("details");
  });

  it("stays on the times while no time is chosen", () => {
    // arrange
    // act
    const state = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
      type: "show-details",
    });

    // assert
    expect(state.step).toBe("slot");
  });

  it("goes back to the times without forgetting the chosen one or the details", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, {
      details: DETAILS,
      type: "show-slots",
    });

    // assert
    expect(state).toMatchObject({
      details: DETAILS,
      selectedSlot: FIRST_SLOT,
      step: "slot",
    });
  });

  it("confirms the booking the server returned", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, {
      response: CONFIRMED,
      type: "response",
    });

    // assert
    expect(state).toMatchObject({
      booking: CONFIRMED.success ? CONFIRMED.booking : null,
      error: null,
      step: "confirmed",
    });
  });

  it("returns to the times and clears the chosen day and time when the slot went, keeping the details", () => {
    // arrange
    const onDetails = reduceBookingFlow(detailsStateFor(FIRST_SLOT), {
      details: DETAILS,
      type: "submit",
    });

    // act
    const state = reduceBookingFlow(onDetails, {
      response: errorResponse("slot_unavailable"),
      type: "response",
    });

    // assert
    expect(state).toMatchObject({
      details: DETAILS,
      selectedDayKey: null,
      selectedSlot: null,
      step: "slot",
    });
    expect(state.error?.code).toBe("slot_unavailable");
  });

  it("keeps the details and the chosen time when the booking is rejected", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, {
      response: errorResponse("booking_refused"),
      type: "response",
    });

    // assert
    expect(state).toMatchObject({
      selectedSlot: FIRST_SLOT,
      step: "details",
    });
    expect(state.error?.code).toBe("booking_refused");
  });

  it("clears an earlier rejection when another time is chosen", () => {
    // arrange
    const rejected = reduceBookingFlow(detailsStateFor(FIRST_SLOT), {
      response: errorResponse("slot_unavailable"),
      type: "response",
    });

    // act
    const state = reduceBookingFlow(rejected, {
      slot: SECOND_SLOT,
      type: "select-slot",
    });

    // assert
    expect(state.error).toBeNull();
    expect(state.selectedSlot).toBe(SECOND_SLOT);
  });
});

function detailsStateFor(slot: string): BookingFlowState {
  const dayOpened = reduceBookingFlow(INITIAL_BOOKING_FLOW, {
    dayKey: FIRST_DAY,
    type: "select-day",
  });

  return reduceBookingFlow(
    reduceBookingFlow(dayOpened, { slot, type: "select-slot" }),
    { type: "show-details" },
  );
}

function errorResponse(
  code: "slot_unavailable" | "booking_refused",
): BookAssessmentCallResponse {
  return {
    error: { code, message: "api-message" },
    success: false,
  };
}
