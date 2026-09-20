import {
  AssessmentCall,
  type AssessmentCallListing,
  type ListAssessmentCallsUseCase,
} from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it, vi } from "vitest";

import { CoachAssessmentCallsController } from "./coach-assessment-calls-controller.server";

const NOW = new Date("2026-10-19T08:00:00.000Z");
const bookedCall = AssessmentCall.reconstitute({
  id: "3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91",
  visitorName: "Ana Popescu",
  visitorEmail: "ana@example.com",
  visitorNotes: "Training three times a week.",
  startsAt: new Date("2026-10-19T14:00:00.000Z"),
  visitorTimeZone: "Europe/Bucharest",
  coachTimeZone: "Europe/Bucharest",
  bookedAt: new Date("2026-10-18T08:00:00.000Z"),
});

describe("CoachAssessmentCallsController", () => {
  it("publishes every booked call with its instants and the link the coach joins on", async () => {
    // arrange
    const controller = createController({
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
          visitorName: "Ana Popescu",
          visitorEmail: "ana@example.com",
          visitorNotes: "Training three times a week.",
          startsAt: "2026-10-19T14:00:00.000Z",
          endsAt: "2026-10-19T14:30:00.000Z",
          joinPath: "/book/3f1e8d0c-2a44-4f6e-9a2b-7c0d5e6f8a91/join",
        },
      ],
      coachTimeZone: "Europe/Bucharest",
      now: "2026-10-19T08:00:00.000Z",
    });
  });

  it("keeps a call the visitor left no notes on", async () => {
    // arrange
    const withoutNotes = AssessmentCall.reconstitute({
      ...bookedCall.toSnapshot(),
      visitorNotes: null,
    });
    const controller = createController({
      coachTimeZone: "Europe/Bucharest",
      calls: [withoutNotes.toSnapshot()],
    });

    // act
    const dashboard = await controller.loadCalls();

    // assert
    expect(dashboard.calls[0]?.visitorNotes).toBeNull();
  });

  it("names the coach's zone and the instant it read at when nothing is booked", async () => {
    // arrange
    const controller = createController({
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
});

function createController(
  listing: AssessmentCallListing,
): CoachAssessmentCallsController {
  return new CoachAssessmentCallsController({
    clock: { now: () => NOW },
    listAssessmentCalls: {
      execute: vi.fn().mockResolvedValue(listing),
    } as unknown as ListAssessmentCallsUseCase,
  });
}
