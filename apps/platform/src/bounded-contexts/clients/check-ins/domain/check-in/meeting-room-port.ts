export interface MeetingRoomPort {
  currentJoinUrl(): Promise<string | null>;
}
