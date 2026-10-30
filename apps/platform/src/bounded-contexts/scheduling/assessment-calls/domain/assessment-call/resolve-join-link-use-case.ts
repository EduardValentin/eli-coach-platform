import type { AssessmentCallReservationsPort } from "./assessment-call-reservations-port";
import type { MeetingRoomPort } from "./meeting-room-port";

export type JoinLinkResult =
  | { status: "found"; url: string }
  | { status: "link_not_set" }
  | { status: "unknown" };

type ResolveJoinLinkUseCaseOptions = {
  meetingRoomPort: MeetingRoomPort;
  assessmentCallReservationsPort: AssessmentCallReservationsPort;
};

export class ResolveJoinLinkUseCase {
  constructor(private readonly options: ResolveJoinLinkUseCaseOptions) {}

  async execute(bookingId: string): Promise<JoinLinkResult> {
    const call =
      await this.options.assessmentCallReservationsPort.findById(bookingId);

    if (!call) {
      return { status: "unknown" };
    }

    const room = await this.options.meetingRoomPort.current();

    if (!room) {
      return { status: "link_not_set" };
    }

    return { status: "found", url: room.url };
  }
}
