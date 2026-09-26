import { describe, expect, it } from "vitest";

import { AssessmentCall } from "../assessment-call";

import { Client } from "./client";

const NOW = new Date("2026-09-26T10:00:00.000Z");

function bookedCall(phone: string | null) {
  return AssessmentCall.reconstitute({
    id: "call-1",
    firstName: "Ana",
    lastName: "Popescu",
    visitorEmail: "ana@example.com",
    visitorNotes: "Training around a desk job.",
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone,
    startsAt: new Date("2026-09-25T15:00:00.000Z"),
    visitorTimeZone: "Europe/Bucharest",
    coachTimeZone: "Europe/Bucharest",
    bookedAt: new Date("2026-09-20T09:12:00.000Z"),
  }).toSnapshot();
}

describe("Client.fromAssessmentCall", () => {
  it.each([
    ["without a phone", null],
    ["with a phone", "+40712345678"],
  ])(
    "copies the booking profile %s and becomes a client now",
    (_label, phone) => {
      // arrange
      const call = bookedCall(phone);

      // act
      const client = Client.fromAssessmentCall(call, NOW);

      // assert
      expect(client.toSnapshot()).toEqual({
        assessmentCallId: "call-1",
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        primaryGoal: "build_strength",
        country: "RO",
        phone,
        createdAt: NOW,
      });
    },
  );
});
