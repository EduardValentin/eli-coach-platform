export interface MeetingRoomPort {
  current(): Promise<{ readonly url: string } | null>;
}
