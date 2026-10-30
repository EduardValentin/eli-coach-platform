import type {
  CheckInActor,
  ResolveCheckInJoinUseCase,
} from "~/bounded-contexts/clients/check-ins/domain/check-in";
import { redirect, type LoaderFunctionArgs } from "react-router";

import {
  checkInIdSchema,
  unknownCheckIn,
} from "~/bounded-contexts/clients/check-ins/adapters/inbound/http/check-in-transport.server";
import { accessContext } from "~/bounded-contexts/access/public/session";

type CheckInJoinControllerOptions = {
  resolveCheckInJoinUseCase: ResolveCheckInJoinUseCase;
};

type RoomNotReady = { status: "link_not_set" };

const ROOM_REDIRECT = 302;

export class CheckInJoinController {
  constructor(private readonly options: CheckInJoinControllerOptions) {}

  async resolveForClient(
    args: LoaderFunctionArgs,
    checkInId: string | undefined,
  ): Promise<RoomNotReady> {
    const client = args.context
      .get(accessContext)
      .requirePortalAccess("CLIENT");

    return this.resolve(
      { party: "client", authSubjectId: client.authSubjectId },
      checkInId,
    );
  }

  async resolveForCoach(
    args: LoaderFunctionArgs,
    checkInId: string | undefined,
  ): Promise<RoomNotReady> {
    args.context.get(accessContext).requirePortalAccess("COACH");

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

    const room = await this.options.resolveCheckInJoinUseCase.execute({
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
