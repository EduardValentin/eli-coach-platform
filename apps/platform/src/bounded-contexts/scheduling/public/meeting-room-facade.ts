export interface MeetingRoomFacade {
  currentJoinUrl(): Promise<string | null>;
}
