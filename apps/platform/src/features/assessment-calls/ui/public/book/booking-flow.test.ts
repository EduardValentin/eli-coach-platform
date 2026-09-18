import { describe, expect, it } from "vitest";

import type { BookAssessmentCallResponse } from "~/features/assessment-calls/contracts/assessment-calls";

import {
  INITIAL_BOOKING_FLOW,
  reduceBookingFlow,
  type BookingFlowState,
} from "./booking-flow";

const FIRST_SLOT = "2026-03-02T15:00:00.000Z";
const SECOND_SLOT = "2026-03-02T16:00:00.000Z";

const CONFIRMED: BookAssessmentCallResponse = {
  booking: {
    durationMinutes: 30,
    id: "2b0f2d2e-6f52-4a2e-9a19-1a1b4b1a6f11",
    joinPath: "/book/2b0f2d2e-6f52-4a2e-9a19-1a1b4b1a6f11/join",
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
      error: null,
      selectedSlot: null,
      step: "slot",
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

  it("goes back to the times without forgetting the chosen one", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, { type: "show-slots" });

    // assert
    expect(state).toMatchObject({ selectedSlot: FIRST_SLOT, step: "slot" });
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

  it("returns to the times and drops the taken one when the slot went", () => {
    // arrange
    const onDetails = detailsStateFor(FIRST_SLOT);

    // act
    const state = reduceBookingFlow(onDetails, {
      response: errorResponse("slot_unavailable"),
      type: "response",
    });

    // assert
    expect(state).toMatchObject({
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
      response: errorResponse("email_already_booked"),
      type: "response",
    });

    // assert
    expect(state).toMatchObject({
      selectedSlot: FIRST_SLOT,
      step: "details",
    });
    expect(state.error?.code).toBe("email_already_booked");
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
  return reduceBookingFlow(
    reduceBookingFlow(INITIAL_BOOKING_FLOW, { slot, type: "select-slot" }),
    { type: "show-details" },
  );
}

function errorResponse(
  code: "slot_unavailable" | "email_already_booked",
): BookAssessmentCallResponse {
  return {
    error: { code, message: "api-message" },
    success: false,
  };
}
