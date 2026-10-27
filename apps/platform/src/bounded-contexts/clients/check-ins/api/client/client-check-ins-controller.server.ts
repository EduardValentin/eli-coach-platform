import type {
  CountCheckInsAwaitingUseCase,
  FindNextClientCheckInUseCase,
  ListClientCheckInsUseCase,
  RequestCheckInResult,
  RequestCheckInUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  checkInOutcomeResponse,
  readCheckInBody,
  refusedCheckIn,
  unknownCheckIn,
} from "~/bounded-contexts/clients/check-ins/api/check-in-transport.server";
import {
  checkInRequestSchema,
  clientCheckInSchema,
  clientCheckInsSchema,
  presentCheckIn,
  type ClientCheckIn,
  type ClientCheckIns,
} from "~/bounded-contexts/clients/check-ins/public/check-ins";

type ClientCheckInsControllerOptions = {
  countCheckInsAwaiting: CountCheckInsAwaitingUseCase;
  findNextClientCheckIn: FindNextClientCheckInUseCase;
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

  async loadNextCheckIn(
    args: LoaderFunctionArgs,
  ): Promise<ClientCheckIn | null> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const next = await this.options.findNextClientCheckIn.execute(
      client.authSubjectId,
    );

    if (next === null) {
      return null;
    }

    return clientCheckInSchema.parse(presentCheckIn(next));
  }

  async loadAwaitingCount(args: LoaderFunctionArgs): Promise<number> {
    const client = requirePortalAccess(args, { role: "CLIENT" });

    return this.options.countCheckInsAwaiting.execute({
      party: "client",
      authSubjectId: client.authSubjectId,
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
