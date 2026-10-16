import { describe, expect, it } from "vitest";

import { Client, type ClientIntake } from "./client";

const NOW = new Date("2026-09-26T10:00:00.000Z");

function intakeWith(phone: string | null): ClientIntake {
  return {
    assessmentCallId: "call-1",
    firstName: "Ana",
    lastName: "Popescu",
    email: "ana@example.com",
    dateOfBirth: "1994-03-14",
    gender: "female",
    primaryGoal: "build_strength",
    country: "RO",
    phone,
    bookingTimeZone: "Europe/Bucharest",
  };
}

describe("Client.admitted", () => {
  it.each([
    ["without a phone", null],
    ["with a phone", "+40712345678"],
  ])(
    "copies the intake %s and becomes a client now under the given id",
    (_label, phone) => {
      // arrange
      const intake = intakeWith(phone);

      // act
      const client = Client.admitted({ id: "client-1", intake, at: NOW });

      // assert
      expect(client.toSnapshot()).toEqual({
        id: "client-1",
        assessmentCallId: "call-1",
        firstName: "Ana",
        lastName: "Popescu",
        email: "ana@example.com",
        dateOfBirth: "1994-03-14",
        gender: "female",
        primaryGoal: "build_strength",
        country: "RO",
        phone,
        bookingTimeZone: "Europe/Bucharest",
        createdAt: NOW,
      });
    },
  );
});
