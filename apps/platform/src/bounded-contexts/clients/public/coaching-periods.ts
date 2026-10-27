type CoachingPeriodDto = {
  clientId: string;
};

type CoachingEndDto = {
  clientId: string;
  endsAt: string;
};

export interface CoachingPeriodsFacade {
  startCoachingPeriod(dto: CoachingPeriodDto): Promise<void>;
  endCoaching(dto: CoachingEndDto): Promise<void>;
}
