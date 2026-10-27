type CoachTimeRequest = { startsAt: string; endsAt: string };

type CoachTimeHold =
  { status: "reserved"; reservationId: string } | { status: "taken" };

export interface CoachTimeFacade {
  reserve(request: CoachTimeRequest): Promise<CoachTimeHold>;
  release(reservationId: string): Promise<void>;
}
