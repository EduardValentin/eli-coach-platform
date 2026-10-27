import type { AssessmentCallReservations } from "./assessment-call-reservations";
import type { MeetingRoom } from "./meeting-room";

export type JoinLinkResult =
  | { status: "found"; url: string }
  | { status: "link_not_set" }
  | { status: "unknown" };

type ResolveJoinLinkUseCaseOptions = {
  meetingRoom: MeetingRoom;
  reservations: AssessmentCallReservations;
};

export class ResolveJoinLinkUseCase {
  constructor(private readonly options: ResolveJoinLinkUseCaseOptions) {}

  async execute(bookingId: string): Promise<JoinLinkResult> {
    const call = await this.options.reservations.findById(bookingId);

    if (!call) {
      return { status: "unknown" };
    }

    const room = await this.options.meetingRoom.current();

    if (!room) {
      return { status: "link_not_set" };
    }

    return { status: "found", url: room.url };
  }
}
