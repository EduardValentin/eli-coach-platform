export interface CoachingEndHandler {
  coachingEnds(notice: { clientId: string; endsAt: Date }): Promise<void>;
}
