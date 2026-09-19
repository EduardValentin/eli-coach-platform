import type { AssessmentCallReservations } from "./assessment-call-reservations";
import type { MeetingRoomLink } from "./meeting-room-link";

export type JoinLinkResult =
  { status: "found"; url: string } | { status: "unknown" };

type ResolveJoinLinkUseCaseOptions = {
  meetingRoomLink: MeetingRoomLink;
  reservations: AssessmentCallReservations;
};

export class ResolveJoinLinkUseCase {
  constructor(private readonly options: ResolveJoinLinkUseCaseOptions) {}

  async execute(bookingId: string): Promise<JoinLinkResult> {
    const call = await this.options.reservations.findById(bookingId);

    if (!call) {
      return { status: "unknown" };
    }

    return {
      status: "found",
      url: await this.options.meetingRoomLink.forCall(call.toSnapshot()),
    };
  }
}
