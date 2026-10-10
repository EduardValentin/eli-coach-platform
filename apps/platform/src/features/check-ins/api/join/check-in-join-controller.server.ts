import type {
  CheckInActor,
  ResolveCheckInJoinUseCase,
} from "@eli-coach-platform/domain/check-in";
import { redirect, type LoaderFunctionArgs } from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInIdSchema,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";

type CheckInJoinControllerOptions = {
  resolveCheckInJoin: ResolveCheckInJoinUseCase;
};

type RoomNotReady = { status: "link_not_set" };

const ROOM_REDIRECT = 302;

export class CheckInJoinController {
  constructor(private readonly options: CheckInJoinControllerOptions) {}

  async resolveForClient(
    args: LoaderFunctionArgs,
    checkInId: string | undefined,
  ): Promise<RoomNotReady> {
    const client = requirePortalAccess(args, { role: "CLIENT" });

    return this.resolve(
      { party: "client", authSubjectId: client.authSubjectId },
      checkInId,
    );
  }

  async resolveForCoach(
    args: LoaderFunctionArgs,
    checkInId: string | undefined,
  ): Promise<RoomNotReady> {
    requirePortalAccess(args, { role: "COACH" });

    return this.resolve({ party: "coach" }, checkInId);
  }

  private async resolve(
    actor: CheckInActor,
    checkInId: string | undefined,
  ): Promise<RoomNotReady> {
    const id = checkInIdSchema.safeParse(checkInId);

    if (!id.success) {
      throw unknownCheckIn();
    }

    const room = await this.options.resolveCheckInJoin.execute({
      actor,
      checkInId: id.data,
    });

    switch (room.status) {
      case "found":
        throw redirect(room.url, ROOM_REDIRECT);
      case "link_not_set":
        return { status: "link_not_set" };
      case "unknown":
        throw unknownCheckIn();
    }
  }
}
