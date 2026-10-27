export interface MeetingRoom {
  current(): Promise<{ readonly url: string } | null>;
}
