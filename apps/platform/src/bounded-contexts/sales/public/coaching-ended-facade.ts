export type CoachingEndedDto = {
  clientId: string;
  coachingEnded: boolean;
};

export interface CoachingEndedFacade {
  coachingEndedOf(clientId: string): Promise<CoachingEndedDto>;
}
