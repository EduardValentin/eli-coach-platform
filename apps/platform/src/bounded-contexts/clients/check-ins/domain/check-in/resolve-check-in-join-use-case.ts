import type { ClientReach } from "~/bounded-contexts/clients/clients/domain/client";
import type { Clock } from "../clock";

import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckIns } from "./check-ins";
import type { MeetingRoom } from "./meeting-room";

export type ResolveCheckInJoinCommand = {
  actor: CheckInActor;
  checkInId: string;
};

export type CheckInJoinResult =
  | { status: "found"; url: string }
  | { status: "link_not_set" }
  | { status: "unknown" };

type ResolveCheckInJoinUseCaseOptions = {
  checkIns: CheckIns;
  clients: Pick<ClientReach, "findByAuthSubjectId">;
  clock: Clock;
  meetingRoom: MeetingRoom;
};

export class ResolveCheckInJoinUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: ResolveCheckInJoinUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(
    command: ResolveCheckInJoinCommand,
  ): Promise<CheckInJoinResult> {
    const checkIn = await this.options.checkIns.find(command.checkInId);

    if (!checkIn?.isJoinableAt(this.options.clock.now())) {
      return { status: "unknown" };
    }

    if (!(await this.reaches(command.actor, checkIn))) {
      return { status: "unknown" };
    }

    const url = await this.options.meetingRoom.currentJoinUrl();

    if (url === null) {
      return { status: "link_not_set" };
    }

    return { status: "found", url };
  }

  private async reaches(
    actor: CheckInActor,
    checkIn: CheckIn,
  ): Promise<boolean> {
    if (actor.party === "coach") {
      return true;
    }

    const clientId = await this.reach.reachableClientIdOf(actor.authSubjectId);

    return clientId !== null && checkIn.isFor(clientId);
  }
}
