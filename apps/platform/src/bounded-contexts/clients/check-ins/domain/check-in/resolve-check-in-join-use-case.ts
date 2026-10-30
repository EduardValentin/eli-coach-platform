import type { ClientReachPort } from "./client-reach-port";
import type { ClockPort } from "../clock-port";

import type { CheckIn } from "./check-in";
import type { CheckInActor } from "./check-in-actor";
import { CheckInActorReach } from "./check-in-actor-reach";
import type { CheckInsPort } from "./check-ins-port";
import type { MeetingRoomPort } from "./meeting-room-port";

export type ResolveCheckInJoinCommand = {
  actor: CheckInActor;
  checkInId: string;
};

export type CheckInJoinResult =
  | { status: "found"; url: string }
  | { status: "link_not_set" }
  | { status: "unknown" };

type ResolveCheckInJoinUseCaseOptions = {
  checkInsPort: CheckInsPort;
  clientReachPort: Pick<ClientReachPort, "findByAuthSubjectId">;
  clockPort: ClockPort;
  meetingRoomPort: MeetingRoomPort;
};

export class ResolveCheckInJoinUseCase {
  private readonly reach: CheckInActorReach;

  constructor(private readonly options: ResolveCheckInJoinUseCaseOptions) {
    this.reach = new CheckInActorReach(options);
  }

  async execute(
    command: ResolveCheckInJoinCommand,
  ): Promise<CheckInJoinResult> {
    const checkIn = await this.options.checkInsPort.find(command.checkInId);

    if (!checkIn?.isJoinableAt(this.options.clockPort.now())) {
      return { status: "unknown" };
    }

    if (!(await this.reaches(command.actor, checkIn))) {
      return { status: "unknown" };
    }

    const url = await this.options.meetingRoomPort.currentJoinUrl();

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
