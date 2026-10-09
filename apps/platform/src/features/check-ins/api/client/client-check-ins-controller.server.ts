import type {
  ListClientCheckInsUseCase,
  ListOpenCheckInTimesUseCase,
  RequestCheckInResult,
  RequestCheckInUseCase,
  WithdrawCheckInRequestResult,
  WithdrawCheckInRequestUseCase,
} from "@eli-coach-platform/domain/check-in";
import { readTextRequestBody } from "@eli-coach-platform/infrastructure/http/server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInOutcomeResponse,
  checkInIdSchema,
  refusedCheckIn,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  checkInRequestSchema,
  clientCheckInsSchema,
  openCheckInTimesSchema,
  presentCheckIn,
  type ClientCheckIns,
} from "~/features/check-ins/public/check-ins";

type ClientCheckInsControllerOptions = {
  listClientCheckIns: ListClientCheckInsUseCase;
  listOpenCheckInTimes: ListOpenCheckInTimesUseCase;
  requestCheckIn: RequestCheckInUseCase;
  withdrawCheckInRequest: WithdrawCheckInRequestUseCase;
};

const CHECK_IN_REQUEST_MAX_BYTES = 16 * 1024;
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

  async listOpenTimes(args: LoaderFunctionArgs): Promise<Response> {
    requirePortalAccess(args, { role: "CLIENT" });

    const times = await this.options.listOpenCheckInTimes.execute();

    return Response.json(
      openCheckInTimesSchema.parse({
        times: times.map((time) => time.toISOString()),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  async request(args: ActionFunctionArgs): Promise<Response> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const submission = checkInRequestSchema.safeParse(
      await ClientCheckInsController.readJsonBody(args.request),
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

    return ClientCheckInsController.requestResponse(result);
  }

  async withdraw(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      return unknownCheckIn();
    }

    const result = await this.options.withdrawCheckInRequest.execute({
      authSubjectId: client.authSubjectId,
      checkInId: id.data,
    });

    return ClientCheckInsController.withdrawalResponse(result);
  }

  private static requestResponse(result: RequestCheckInResult): Response {
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

  private static withdrawalResponse(
    result: WithdrawCheckInRequestResult,
  ): Response {
    switch (result.status) {
      case "withdrawn":
        return checkInOutcomeResponse(
          { status: "withdrawn", checkInId: result.checkIn.id },
          { status: 200 },
        );
      case "unknown":
        return unknownCheckIn();
      case "ended":
        return refusedCheckIn("ended");
      case "not_pending":
      case "expired":
      case "not_your_turn":
        return refusedCheckIn("not_pending");
    }
  }

  private static async readJsonBody(request: Request): Promise<unknown> {
    const body = await readTextRequestBody(request, {
      maxBytes: CHECK_IN_REQUEST_MAX_BYTES,
    });

    if (body.status !== "valid") {
      return undefined;
    }

    try {
      return JSON.parse(body.text);
    } catch {
      return undefined;
    }
  }
}
