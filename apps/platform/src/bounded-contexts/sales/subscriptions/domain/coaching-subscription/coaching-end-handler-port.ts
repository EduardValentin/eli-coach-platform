export interface CoachingEndHandlerPort {
  coachingEnds(notice: { clientId: string; endsAt: Date }): Promise<void>;
}
