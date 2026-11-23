export interface CoachingEndedPort {
  hasEnded(clientId: string): Promise<boolean>;
}
