import { describe, expect, it } from "vitest";

import { AssessmentCall, type AssessmentCallProps } from "./assessment-call";
import { ASSESSMENT_CALL_RULES } from "./assessment-call-rules";

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
  it("reserves when the coach's time was reserved and the email has no upcoming call", () => {
    // arrange
    const input = {
      coachTime: "reserved",
      upcomingCallForEmail: null,
    } as const;

    // act
    const decision = AssessmentCall.decideReservation(input);

    // assert
    expect(decision).toEqual({ status: "reserved" });
  });

  it("reports the slot taken when the coach's time was already taken", () => {
    // arrange
    const input = { coachTime: "taken", upcomingCallForEmail: null } as const;

    // act
    const decision = AssessmentCall.decideReservation(input);

    // assert
    expect(decision).toEqual({ status: "slot_taken" });
  });

  it("reports the email already holding an upcoming call", () => {
    // arrange
    const upcomingCallForEmail = bookedCall({ id: "call-2" });

    // act
    const decision = AssessmentCall.decideReservation({
      coachTime: "reserved",
      upcomingCallForEmail,
    });

    // assert
    expect(decision).toEqual({ status: "email_has_upcoming_call" });
  });

  it("puts the taken slot ahead of the email's upcoming call, whoever holds it", () => {
    // arrange
    const ownCall = bookedCall();

    // act
    const decision = AssessmentCall.decideReservation({
      coachTime: "taken",
      upcomingCallForEmail: ownCall,
    });

    // assert
    expect(decision).toEqual({ status: "slot_taken" });
  });
});

describe("ASSESSMENT_CALL_RULES", () => {
  it("is the single home of the assessment call's slot policy", () => {
    // arrange
    const rules = ASSESSMENT_CALL_RULES;

    // act
    const values = {
      durationMinutes: rules.durationMinutes,
      bufferMinutes: rules.bufferMinutes,
      stepMinutes: rules.stepMinutes,
      horizonDays: rules.horizonDays,
      leadMinutes: rules.leadMinutes,
    };

    // assert
    expect(values).toEqual({
      durationMinutes: 30,
      bufferMinutes: 30,
      stepMinutes: 60,
      horizonDays: 30,
      leadMinutes: 120,
    });
  });

  it("steps by a call plus its buffer, so every booking reserves the buffer", () => {
    // arrange
    const rules = ASSESSMENT_CALL_RULES;

    // act
    const step = rules.stepMinutes;

    // assert
    expect(step).toBe(rules.durationMinutes + rules.bufferMinutes);
  });

  it("reserves the coach's time through the call and its buffer", () => {
    // arrange
    const start = new Date("2026-06-01T14:00:00.000Z");

    // act
    const coachTime = ASSESSMENT_CALL_RULES.coachTimeFrom(start);

    // assert
    expect(coachTime).toEqual({
      start,
      end: new Date("2026-06-01T15:00:00.000Z"),
    });
  });
});
