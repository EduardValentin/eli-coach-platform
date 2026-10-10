import type {
  CoachCheckInView,
  ListCoachCheckInsUseCase,
  ReadClientCheckInSchedulingUseCase,
  ScheduleCheckInResult,
  ScheduleCheckInUseCase,
} from "@eli-coach-platform/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  checkInOutcomeResponse,
  readCheckInBody,
  refusedCheckIn,
  unknownCheckIn,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  checkInScheduleSchema,
  coachCheckInsSchema,
  presentCheckIn,
  type CheckInScheduling,
  type CoachCheckIn,
  type CoachCheckIns,
} from "~/features/check-ins/public/check-ins";

type CoachCheckInsControllerOptions = {
  listCoachCheckIns: ListCoachCheckInsUseCase;
  readClientCheckInScheduling: ReadClientCheckInSchedulingUseCase;
  scheduleCheckIn: ScheduleCheckInUseCase;
};

const CREATED = 201;
const UNPROCESSABLE = 422;

const clientIdSchema = z.uuid();

export class CoachCheckInsController {
  constructor(private readonly options: CoachCheckInsControllerOptions) {}

  async loadCheckIns(args: LoaderFunctionArgs): Promise<CoachCheckIns> {
    requirePortalAccess(args, { role: "COACH" });

    const checkIns = await this.options.listCoachCheckIns.execute();

    return coachCheckInsSchema.parse({
      checkIns: checkIns.map((view) => this.present(view)),
    });
  }

  async loadClientScheduling(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<CheckInScheduling> {
    requirePortalAccess(args, { role: "COACH" });

    const id = clientIdSchema.safeParse(clientId);

    if (!id.success) {
      throw unknownCheckIn();
    }

    const scheduling = await this.options.readClientCheckInScheduling.execute(
      id.data,
    );

    if (scheduling === "unknown") {
      throw unknownCheckIn();
    }

    return scheduling;
  }

  async schedule(args: ActionFunctionArgs): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const submission = checkInScheduleSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!submission.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    const result = await this.options.scheduleCheckIn.execute({
      clientId: submission.data.clientId,
      startsAt: new Date(submission.data.startsAt),
      note: submission.data.note ?? null,
    });

    return this.respondToSchedule(result);
  }

  private respondToSchedule(result: ScheduleCheckInResult): Response {
    switch (result.status) {
      case "scheduled":
        return checkInOutcomeResponse(
          { status: "scheduled", checkInId: result.checkIn.id },
          { status: CREATED },
        );
      case "unknown_client":
        return unknownCheckIn();
      case "note_too_long":
      case "invalid_time_zone":
        return refusedCheckIn(result.status, { status: UNPROCESSABLE });
      case "client_cannot_answer":
      case "time_taken":
        return refusedCheckIn(result.status);
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
