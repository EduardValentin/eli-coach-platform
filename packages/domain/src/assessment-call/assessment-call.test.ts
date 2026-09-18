import { describe, expect, it } from "vitest";

import { AssessmentCall, type AssessmentCallProps } from "./assessment-call";

const BOOKED_CALL = {
  id: "call-1",
  visitorName: "Ana Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training around a desk job.",
  startsAt: new Date("2026-06-01T15:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-05-30T09:12:00.000Z"),
} satisfies AssessmentCallProps;

function bookedCall(props?: Partial<AssessmentCallProps>): AssessmentCall {
  return AssessmentCall.reconstitute({ ...BOOKED_CALL, ...props });
}

describe("AssessmentCall#endsAt", () => {
  it("ends one assessment call duration after the start", () => {
    // arrange
    const call = bookedCall();

    // act
    const endsAt = call.endsAt();

    // assert
    expect(endsAt.toISOString()).toBe("2026-06-01T15:30:00.000Z");
  });
});

describe("AssessmentCall#toSnapshot", () => {
  it("carries every field and the derived end as instants", () => {
    // arrange
    const call = bookedCall();

    // act
    const snapshot = call.toSnapshot();

    // assert
    expect(snapshot).toEqual({
      id: "call-1",
      visitorName: "Ana Popescu",
      visitorEmail: "ana@example.com",
      visitorNotes: "Training around a desk job.",
      startsAt: new Date("2026-06-01T15:00:00.000Z"),
      endsAt: new Date("2026-06-01T15:30:00.000Z"),
      visitorTimeZone: "Europe/Bucharest",
      coachTimeZone: "Europe/Bucharest",
      bookedAt: new Date("2026-05-30T09:12:00.000Z"),
    });
  });

  it("keeps absent notes absent", () => {
    // arrange
    const call = bookedCall({ visitorNotes: null });

    // act
    const snapshot = call.toSnapshot();

    // assert
    expect(snapshot.visitorNotes).toBeNull();
  });
});

describe("AssessmentCall.decideReservation", () => {
  it("reserves when the slot is free and the email has no upcoming call", () => {
    // arrange
    const input = { slotHolder: null, upcomingCallForEmail: null };

    // act
    const decision = AssessmentCall.decideReservation(input);

    // assert
    expect(decision).toEqual({ status: "reserved" });
  });

  it("reports the slot taken when another visitor holds it", () => {
    // arrange
    const slotHolder = bookedCall({ visitorEmail: "other@example.com" });

    // act
    const decision = AssessmentCall.decideReservation({
      slotHolder,
      upcomingCallForEmail: null,
    });

    // assert
    expect(decision).toEqual({ status: "slot_taken" });
  });

  it("reports the email already holding an upcoming call", () => {
    // arrange
    const upcomingCallForEmail = bookedCall({ id: "call-2" });

    // act
    const decision = AssessmentCall.decideReservation({
      slotHolder: null,
      upcomingCallForEmail,
    });

    // assert
    expect(decision).toEqual({ status: "email_has_upcoming_call" });
  });

  it("puts the taken slot ahead of the email's upcoming call", () => {
    // arrange
    const slotHolder = bookedCall({ visitorEmail: "other@example.com" });
    const upcomingCallForEmail = bookedCall({ id: "call-2" });

    // act
    const decision = AssessmentCall.decideReservation({
      slotHolder,
      upcomingCallForEmail,
    });

    // assert
    expect(decision).toEqual({ status: "slot_taken" });
  });

  it("treats a visitor's own slot as taken, exactly as it treats anyone else's", () => {
    // arrange
    const ownCall = bookedCall();

    // act
    const decision = AssessmentCall.decideReservation({
      slotHolder: ownCall,
      upcomingCallForEmail: ownCall,
    });

    // assert
    expect(decision).toEqual({ status: "slot_taken" });
  });
});
