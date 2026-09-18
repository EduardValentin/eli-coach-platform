import {
  AssessmentCall,
  type MeetingRoomLink,
} from "@eli-coach-platform/domain/assessment-call";
import { describe, expect, it } from "vitest";

import { ConfiguredMeetingRoomLink } from "./configured-meeting-room-link.server";

describe("ConfiguredMeetingRoomLink", () => {
  it("sends every booked call to the configured meeting room", async () => {
    // arrange
    const meetingRoomLink: MeetingRoomLink = new ConfiguredMeetingRoomLink(
      "https://meet.example.com/eli-assessment",
    );
    const call = AssessmentCall.reconstitute({
      id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
      visitorName: "Ana Popescu",
      visitorEmail: "ana@example.com",
      visitorNotes: null,
      startsAt: new Date("2026-10-01T14:00:00.000Z"),
      visitorTimeZone: "Europe/Bucharest",
      coachTimeZone: "Europe/Bucharest",
      bookedAt: new Date("2026-09-18T09:30:00.000Z"),
    });

    // act
    const url = await meetingRoomLink.forCall(call.toSnapshot());

    // assert
    expect(url).toBe("https://meet.example.com/eli-assessment");
  });
});
