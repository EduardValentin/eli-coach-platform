export interface MeetingRoom {
  currentJoinUrl(): Promise<string | null>;
}
