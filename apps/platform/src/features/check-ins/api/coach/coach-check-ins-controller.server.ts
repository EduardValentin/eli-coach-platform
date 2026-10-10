import type {
  ApproveCheckInResult,
  ApproveCheckInUseCase,
  CoachCheckInView,
  DeclineCheckInResult,
  DeclineCheckInUseCase,
  ListCoachCheckInsUseCase,
} from "@eli-coach-platform/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInOutcomeResponse,
  checkInIdSchema,
  refusedCheckIn,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  coachCheckInsSchema,
  presentCheckIn,
  type CoachCheckIn,
  type CoachCheckIns,
} from "~/features/check-ins/public/check-ins";

type CoachCheckInsControllerOptions = {
  approveCheckIn: ApproveCheckInUseCase;
  declineCheckIn: DeclineCheckInUseCase;
  listCoachCheckIns: ListCoachCheckInsUseCase;
};

type CoachAnswer = ApproveCheckInResult | DeclineCheckInResult;

export class CoachCheckInsController {
  constructor(private readonly options: CoachCheckInsControllerOptions) {}

  async loadCheckIns(args: LoaderFunctionArgs): Promise<CoachCheckIns> {
    requirePortalAccess(args, { role: "COACH" });

    const checkIns = await this.options.listCoachCheckIns.execute();

    return coachCheckInsSchema.parse({
      checkIns: checkIns.map((view) => this.present(view)),
    });
  }

  async approve(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      return unknownCheckIn();
    }

    return this.respondToAnswer(
      await this.options.approveCheckIn.execute(id.data),
    );
  }

  async decline(
    args: ActionFunctionArgs,
    checkInId: string | undefined,
  ): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      return unknownCheckIn();
    }

    return this.respondToAnswer(
      await this.options.declineCheckIn.execute(id.data),
    );
  }

  private respondToAnswer(result: CoachAnswer): Response {
    switch (result.status) {
      case "approved":
      case "declined":
        return checkInOutcomeResponse(
          { status: result.status, checkInId: result.checkIn.id },
          { status: 200 },
        );
      case "unknown":
        return unknownCheckIn();
      case "not_pending":
      case "expired":
      case "not_your_turn":
        return refusedCheckIn("not_pending");
    }
  }

  private present(view: CoachCheckInView): CoachCheckIn {
    return {
      ...presentCheckIn(view),
      client: {
        firstName: view.client.firstName,
        lastName: view.client.lastName,
      },
    };
  }
}
