import type { CoachMeetingRoomSource } from "../coach-meeting-room";
import type { Clock } from "../shared";

import type { CheckIn } from "./check-in";
import { CheckInClientReach } from "./check-in-client-reach";
import type { CheckInClients } from "./check-in-clients";
import type { CheckIns } from "./check-ins";

export type CheckInRequester =
  { party: "coach" } | { party: "client"; authSubjectId: string };

export type ResolveCheckInJoinCommand = {
  requester: CheckInRequester;
  checkInId: string;
};

export type CheckInJoinResult =
  | { status: "found"; url: string }
  | { status: "link_not_set" }
  | { status: "unknown" };

type ResolveCheckInJoinUseCaseOptions = {
  checkIns: CheckIns;
  clients: CheckInClients;
  clock: Clock;
  meetingRoom: CoachMeetingRoomSource;
};

export class ResolveCheckInJoinUseCase {
  private readonly reach: CheckInClientReach;

  constructor(private readonly options: ResolveCheckInJoinUseCaseOptions) {
    this.reach = new CheckInClientReach(options);
  }

  async execute(
    command: ResolveCheckInJoinCommand,
  ): Promise<CheckInJoinResult> {
    const checkIn = await this.options.checkIns.find(command.checkInId);

    if (!checkIn?.isJoinableAt(this.options.clock.now())) {
      return { status: "unknown" };
    }

    if (!(await this.reaches(command.requester, checkIn))) {
      return { status: "unknown" };
    }

    const room = await this.options.meetingRoom.current();

    if (!room) {
      return { status: "link_not_set" };
    }

    return { status: "found", url: room.url };
  }

  private async reaches(
    requester: CheckInRequester,
    checkIn: CheckIn,
  ): Promise<boolean> {
    if (requester.party === "coach") {
      return true;
    }

    const clientId = await this.reach.reachableClientIdOf(
      requester.authSubjectId,
    );

    return clientId !== null && checkIn.isFor(clientId);
  }
}
