import type {
  ListClientCheckInsUseCase,
  RequestCheckInResult,
  RequestCheckInUseCase,
} from "@eli-coach-platform/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInOutcomeResponse,
  readCheckInBody,
  refusedCheckIn,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  checkInRequestSchema,
  clientCheckInsSchema,
  presentCheckIn,
  type ClientCheckIns,
} from "~/features/check-ins/public/check-ins";

type ClientCheckInsControllerOptions = {
  listClientCheckIns: ListClientCheckInsUseCase;
  requestCheckIn: RequestCheckInUseCase;
};

const CREATED = 201;
const UNPROCESSABLE = 422;

export class ClientCheckInsController {
  constructor(private readonly options: ClientCheckInsControllerOptions) {}

  async loadCheckIns(args: LoaderFunctionArgs): Promise<ClientCheckIns> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const listing = await this.options.listClientCheckIns.execute(
      client.authSubjectId,
    );

    if (listing.status === "ended") {
      throw unknownCheckIn();
    }

    return clientCheckInsSchema.parse({
      checkIns: listing.checkIns.map(presentCheckIn),
    });
  }

  async request(args: ActionFunctionArgs): Promise<Response> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const submission = checkInRequestSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!submission.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    const result = await this.options.requestCheckIn.execute({
      authSubjectId: client.authSubjectId,
      startsAt: new Date(submission.data.startsAt),
      clientTimeZone: submission.data.timeZone,
      note: submission.data.note ?? null,
    });

    return this.respondToCheckInRequest(result);
  }

  private respondToCheckInRequest(result: RequestCheckInResult): Response {
    switch (result.status) {
      case "requested":
        return checkInOutcomeResponse(
          { status: "requested", checkInId: result.checkIn.id },
          { status: CREATED },
        );
      case "note_too_long":
      case "invalid_time_zone":
        return refusedCheckIn(result.status, { status: UNPROCESSABLE });
      case "request_waiting":
      case "time_taken":
      case "ended":
        return refusedCheckIn(result.status);
    }
  }
}
