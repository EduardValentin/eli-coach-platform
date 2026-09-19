import type { MeetingRoomLink } from "@eli-coach-platform/domain/assessment-call";

export class ConfiguredMeetingRoomLink implements MeetingRoomLink {
  constructor(private readonly meetingLink: string) {}

  forCall(): Promise<string> {
    return Promise.resolve(this.meetingLink);
  }
}
