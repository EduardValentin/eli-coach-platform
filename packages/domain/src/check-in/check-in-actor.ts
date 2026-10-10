export type CheckInActor =
  { party: "coach" } | { party: "client"; authSubjectId: string };

export type CheckInActorCommand = {
  checkInId: string;
  actor: CheckInActor;
  clientTimeZone?: string;
};
