import type {
  ApproveCheckInResult,
  ApproveCheckInUseCase,
  CancelCheckInResult,
  CancelCheckInUseCase,
  CheckInActor,
  CheckInActorCommand,
  DeclineCheckInResult,
  DeclineCheckInUseCase,
  ListOpenCheckInTimesCommand,
  ListOpenCheckInTimesResult,
  ListOpenCheckInTimesUseCase,
  ProposeCheckInTimeResult,
  ProposeCheckInTimeUseCase,
  WithdrawCheckInRequestResult,
  WithdrawCheckInRequestUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/bounded-contexts/access/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  checkInIdSchema,
  checkInOutcomeResponse,
  readCheckInBody,
  refusedCheckIn,
  unknownCheckIn,
  unknownClient,
} from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/check-in-transport.server";
import {
  checkInAnswerSchema,
  checkInNewTimeSchema,
  openCheckInTimesQuerySchema,
  openCheckInTimesSchema,
} from "~/bounded-contexts/clients/check-ins/public/check-ins";

type SharedCheckInsControllerOptions = {
  approveCheckIn: ApproveCheckInUseCase;
  cancelCheckIn: CancelCheckInUseCase;
  declineCheckIn: DeclineCheckInUseCase;
  listOpenCheckInTimes: ListOpenCheckInTimesUseCase;
  proposeCheckInTime: ProposeCheckInTimeUseCase;
  withdrawCheckInRequest: WithdrawCheckInRequestUseCase;
};

type CheckInDecisionResult =
  | ApproveCheckInResult
  | CancelCheckInResult
  | DeclineCheckInResult
  | WithdrawCheckInRequestResult;

type CheckInDecision = {
  execute(command: CheckInActorCommand): Promise<CheckInDecisionResult>;
};

type DecisionRequest = {
  args: ActionFunctionArgs;
  checkInId: string | undefined;
  decision: CheckInDecision;
};

const UNPROCESSABLE = 422;

export class SharedCheckInsController {
  constructor(private readonly options: SharedCheckInsControllerOptions) {}

  async listOpenTimes(args: LoaderFunctionArgs): Promise<Response> {
    const command = this.openTimesCommandOf(
      this.requireCheckInActor(args),
      args.url,
    );

    if (!command) {
      return unknownClient();
    }

    const result = await this.options.listOpenCheckInTimes.execute(command);

    return this.respondToOpenTimes(result);
  }

  async proposeNewTime(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    const actor = this.requireCheckInActor(args);
    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      return unknownCheckIn();
    }

    const newTime = checkInNewTimeSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!newTime.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    const result = await this.options.proposeCheckInTime.execute({
      checkInId: id.data,
      actor,
      startsAt: new Date(newTime.data.startsAt),
      note: newTime.data.note ?? null,
      ...(newTime.data.timeZone && { clientTimeZone: newTime.data.timeZone }),
    });

    return this.respondToProposal(result);
  }

  cancel(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    return this.decide({
      args,
      checkInId,
      decision: this.options.cancelCheckIn,
    });
  }

  approve(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    return this.decide({
      args,
      checkInId,
      decision: this.options.approveCheckIn,
    });
  }

  decline(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    return this.decide({
      args,
      checkInId,
      decision: this.options.declineCheckIn,
    });
  }

  withdraw(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    return this.decide({
      args,
      checkInId,
      decision: this.options.withdrawCheckInRequest,
    });
  }

  private async decide({
    args,
    checkInId,
    decision,
  }: DecisionRequest): Promise<Response> {
    const actor = this.requireCheckInActor(args);
    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      return unknownCheckIn();
    }

    const answer = checkInAnswerSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!answer.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    const result = await decision.execute({
      checkInId: id.data,
      actor,
      ...(answer.data.timeZone && { clientTimeZone: answer.data.timeZone }),
    });

    return this.respondToDecision(result);
  }

  private openTimesCommandOf(
    actor: CheckInActor,
    url: URL,
  ): ListOpenCheckInTimesCommand | null {
    if (actor.party !== "coach") {
      return { actor };
    }

    const query = openCheckInTimesQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );

    return query.success ? { actor, clientId: query.data.clientId } : null;
  }

  private respondToOpenTimes(result: ListOpenCheckInTimesResult): Response {
    switch (result.status) {
      case "listed":
        return Response.json(
          openCheckInTimesSchema.parse({
            times: result.times.map((time) => time.toISOString()),
          }),
          { headers: { "Cache-Control": "no-store" } },
        );
      case "client_required":
        return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
      case "unknown_client":
        return unknownClient();
      case "ended":
        return refusedCheckIn("ended");
    }
  }

  private respondToProposal(result: ProposeCheckInTimeResult): Response {
    switch (result.status) {
      case "proposed":
        return checkInOutcomeResponse(
          { status: "proposed", checkInId: result.checkIn.id },
          { status: 200 },
        );
      case "unknown":
        return unknownCheckIn();
      case "invalid_time_zone":
      case "note_too_long":
        return refusedCheckIn(result.status, { status: UNPROCESSABLE });
      case "ended":
      case "time_taken":
      case "moves_exhausted":
      case "not_next_weekly":
        return refusedCheckIn(result.status);
      case "changed_meanwhile":
      case "not_pending":
      case "expired":
      case "not_your_turn":
        return refusedCheckIn("not_pending");
    }
  }

  private respondToDecision(result: CheckInDecisionResult): Response {
    switch (result.status) {
      case "approved":
      case "cancelled":
      case "declined":
      case "withdrawn":
        return checkInOutcomeResponse(
          { status: result.status, checkInId: result.checkIn.id },
          { status: 200 },
        );
      case "unknown":
        return unknownCheckIn();
      case "ended":
        return refusedCheckIn("ended");
      case "invalid_time_zone":
        return refusedCheckIn("invalid_time_zone", { status: UNPROCESSABLE });
      case "changed_meanwhile":
      case "not_pending":
      case "not_approved":
      case "not_allowed":
      case "expired":
      case "not_your_turn":
        return refusedCheckIn("not_pending");
    }
  }

  private requireCheckInActor(args: LoaderFunctionArgs): CheckInActor {
    const account = requireApiAccount(args);

    requirePortalAccess(args, { role: account.role });

    return account.role === "COACH"
      ? { party: "coach" }
      : { party: "client", authSubjectId: account.authSubjectId };
  }
}
