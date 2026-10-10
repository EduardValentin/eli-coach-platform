import type {
  ApproveCheckInResult,
  ApproveCheckInUseCase,
  CheckInActor,
  CheckInActorCommand,
  DeclineCheckInResult,
  DeclineCheckInUseCase,
  ListOpenCheckInTimesUseCase,
  WithdrawCheckInRequestResult,
  WithdrawCheckInRequestUseCase,
} from "@eli-coach-platform/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInIdSchema,
  checkInOutcomeResponse,
  readCheckInBody,
  refusedCheckIn,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  checkInAnswerSchema,
  openCheckInTimesSchema,
} from "~/features/check-ins/public/check-ins";

type SharedCheckInsControllerOptions = {
  approveCheckIn: ApproveCheckInUseCase;
  declineCheckIn: DeclineCheckInUseCase;
  listOpenCheckInTimes: ListOpenCheckInTimesUseCase;
  withdrawCheckInRequest: WithdrawCheckInRequestUseCase;
};

type CheckInDecisionResult =
  ApproveCheckInResult | DeclineCheckInResult | WithdrawCheckInRequestResult;

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
    this.actorOf(args);

    const times = await this.options.listOpenCheckInTimes.execute();

    return Response.json(
      openCheckInTimesSchema.parse({
        times: times.map((time) => time.toISOString()),
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
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
    const actor = this.actorOf(args);
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

  private respondToDecision(result: CheckInDecisionResult): Response {
    switch (result.status) {
      case "approved":
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
      case "not_pending":
      case "expired":
      case "not_your_turn":
        return refusedCheckIn("not_pending");
    }
  }

  private actorOf(args: LoaderFunctionArgs): CheckInActor {
    const account = requireApiAccount(args);

    requirePortalAccess(args, { role: account.role });

    return account.role === "COACH"
      ? { party: "coach" }
      : { party: "client", authSubjectId: account.authSubjectId };
  }
}
