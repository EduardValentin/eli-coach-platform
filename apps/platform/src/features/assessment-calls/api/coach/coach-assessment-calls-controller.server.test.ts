import {
  AssessmentCall,
  type AssessmentCallListingResult,
  type ListAssessmentCallsUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it, vi } from "vitest";

import { COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE } from "~/features/assessment-calls/contracts/assessment-calls";

import { CoachAssessmentCallsController } from "./coach-assessment-calls-controller.server";

const NOW = new Date("2026-10-19T08:00:00.000Z");
const bookedCall = AssessmentCall.reconstitute({
  id: "3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91",
  firstName: "Ana",
  lastName: "Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  dateOfBirth: "1994-03-14",
  gender: "female",
  primaryGoal: "build_strength",
  country: "RO",
  phone: "+40712345678",
  startsAt: new Date("2026-10-19T14:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-10-18T08:00:00.000Z"),
});

describe("CoachAssessmentCallsController", () => {
  it("publishes every booked call with the visitor's profile, its instants and the link the coach joins on", async () => {
    // arrange
    const controller = createController({
      status: "ok",
      coachTimeZone: "Europe/Bucharest",
      calls: [bookedCall.toSnapshot()],
    });

    // act
    const dashboard = await controller.loadCalls();

    // assert
    expect(dashboard).toEqual({
      calls: [
        {
          id: "3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91",
          firstName: "Ana",
          lastName: "Popescu",
          fullName: "Ana Popescu",
          visitorEmail: "ana@example.com",
          visitorNotes: "Training three times a week.",
          dateOfBirth: "1994-03-14",
          gender: "female",
          primaryGoal: "build_strength",
          country: "RO",
          phone: "+40712345678",
          startsAt: "2026-10-19T14:00:00.000Z",
          endsAt: "2026-10-19T14:30:00.000Z",
          bookedAt: "2026-10-18T08:00:00.000Z",
          joinPath: "/book/3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91/join",
        },
      ],
      coachTimeZone: "Europe/Bucharest",
      now: "2026-10-19T08:00:00.000Z",
    });
  });

  it("keeps a call the visitor left no notes or phone on", async () => {
    // arrange
    const withoutNotes = AssessmentCall.reconstitute({
      ...bookedCall.toSnapshot(),
      phone: null,
      visitorNotes: null,
    });
    const controller = createController({
      status: "ok",
      coachTimeZone: "Europe/Bucharest",
      calls: [withoutNotes.toSnapshot()],
    });

    // act
    const dashboard = await controller.loadCalls();

    // assert
    expect(dashboard.calls[0]?.visitorNotes).toBeNull();
    expect(dashboard.calls[0]?.phone).toBeNull();
  });

  it("names the coach's zone and the instant it read at when nothing is booked", async () => {
    // arrange
    const controller = createController({
      status: "ok",
      coachTimeZone: "Europe/Chisinau",
      calls: [],
    });

    // act
    const dashboard = await controller.loadCalls();

    // assert
    expect(dashboard).toEqual({
      calls: [],
      coachTimeZone: "Europe/Chisinau",
      now: "2026-10-19T08:00:00.000Z",
    });
  });

  it("answers 503 with the coach's copy when the listing is unavailable", async () => {
    // arrange
    const controller = createController({ status: "unavailable" });

    // act
    const loading = controller.loadCalls();

    // assert
    const thrown = await loading.catch((error: unknown) => error);
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(503);
    await expect((thrown as Response).text()).resolves.toBe(
      COACH_ASSESSMENT_CALLS_UNAVAILABLE_MESSAGE,
    );
  });
});

function createController(
  listing: AssessmentCallListingResult,
): CoachAssessmentCallsController {
  return new CoachAssessmentCallsController({
    clock: { now: () => NOW },
    listAssessmentCalls: {
      execute: vi.fn().mockResolvedValue(listing),
    } as unknown as ListAssessmentCallsUseCase,
  });
}
