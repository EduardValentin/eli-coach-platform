import {
  CheckInTimeZone,
  type CheckInTimeZoneResult,
} from "./check-in-time-zone";

export type CheckInActor =
  { party: "coach" } | { party: "client"; authSubjectId: string };

export type CheckInActorCommand = {
  checkInId: string;
  actor: CheckInActor;
  clientTimeZone?: string;
};

export type ActingClientZone =
  | { status: "valid"; timeZone: CheckInTimeZone | null }
  | Exclude<CheckInTimeZoneResult, { status: "valid" }>;

export function actingClientZoneOf(
  command: CheckInActorCommand,
): ActingClientZone {
  if (command.actor.party === "coach" || command.clientTimeZone === undefined) {
    return { status: "valid", timeZone: null };
  }

  return CheckInTimeZone.from(command.clientTimeZone);
}
