import {
  waitlistJoinErrorSchema,
  waitlistJoinSuccessSchema,
  waitlistSnapshotSchema,
} from "@eli-coach-platform/contracts";
import type { JoinWaitlistResult, WaitingListService } from "@eli-coach-platform/domain";

export class WaitlistController {
  constructor(private readonly waitingListService: WaitingListService) {}

  async getSnapshot(): Promise<Response> {
    const waitlist = await this.waitingListService.getWaitlist();
    const responseBody = waitlistSnapshotSchema.parse({
      enabled: waitlist.enabled,
      cap: waitlist.cap,
      spotsRemaining: waitlist.spotsRemaining,
    });

    return Response.json(responseBody);
  }

  async join(request: Request): Promise<Response> {
    const formData = await request.formData();
    const emailValue = formData.get("email");
    const email = typeof emailValue === "string" ? emailValue : "";
    const result = await this.waitingListService.joinWaitlist({ email });

    return createJoinResponse(result);
  }
}

function createJoinResponse(result: JoinWaitlistResult): Response {
  if (result.status === "joined") {
    return Response.json(
      waitlistJoinSuccessSchema.parse({
        success: true,
        spotsRemaining: result.spotsRemaining,
      }),
      { status: 201 },
    );
  }

  const responseBody = waitlistJoinErrorSchema.parse({
    success: false,
    error: {
      code: result.status,
      message: result.message,
    },
  });

  return Response.json(responseBody, {
    status: resolveJoinErrorStatus(result.status),
  });
}

function resolveJoinErrorStatus(status: Exclude<JoinWaitlistResult["status"], "joined">): number {
  if (status === "already_joined" || status === "spots_full") {
    return 409;
  }

  return 400;
}
