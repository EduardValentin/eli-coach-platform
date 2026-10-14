import type {
  ChangeCheckInSeriesResult,
  ChangeCheckInSeriesUseCase,
  PreviewCheckInSeriesResult,
  PreviewCheckInSeriesUseCase,
  ReadCoachClientSeriesUseCase,
  SetUpCheckInSeriesResult,
  SetUpCheckInSeriesUseCase,
  StopCheckInSeriesResult,
  StopCheckInSeriesUseCase,
} from "@eli-coach-platform/domain/check-in";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { z } from "zod";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  readCheckInBody,
  refusedCheckIn,
  unknownClient,
} from "~/features/check-ins/api/check-in-transport.server";
import {
  checkInSeriesChangeSchema,
  checkInSeriesOutcomeSchema,
  checkInSeriesPreviewQuerySchema,
  checkInSeriesPreviewSchema,
  checkInSeriesSetUpSchema,
  coachClientSeriesSchema,
  type CheckInSeriesOutcomeReply,
  type CoachClientSeriesPanel,
} from "~/features/check-ins/public/check-ins";

type CoachCheckInSeriesControllerOptions = {
  changeCheckInSeries: ChangeCheckInSeriesUseCase;
  previewCheckInSeries: PreviewCheckInSeriesUseCase;
  readCoachClientSeries: ReadCoachClientSeriesUseCase;
  setUpCheckInSeries: SetUpCheckInSeriesUseCase;
  stopCheckInSeries: StopCheckInSeriesUseCase;
};

const OK = 200;
const CREATED = 201;
const UNPROCESSABLE = 422;

const idSchema = z.uuid();

export class CoachCheckInSeriesController {
  constructor(private readonly options: CoachCheckInSeriesControllerOptions) {}

  async loadClientSeries(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<CoachClientSeriesPanel> {
    requirePortalAccess(args, { role: "COACH" });

    const id = idSchema.safeParse(clientId);

    if (!id.success) {
      throw unknownClient();
    }

    const { series, coachingEnds } =
      await this.options.readCoachClientSeries.execute(id.data);

    return coachClientSeriesSchema.parse({
      series: series && {
        id: series.id,
        weekday: series.weekday,
        hour: series.hour,
        timeZone: series.timeZone,
      },
      coachingEnds,
    });
  }

  async preview(args: LoaderFunctionArgs): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const query = checkInSeriesPreviewQuerySchema.safeParse(
      Object.fromEntries(new URL(args.request.url).searchParams),
    );

    if (!query.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    return this.respondToPreview(
      await this.options.previewCheckInSeries.execute(query.data),
    );
  }

  async setUp(args: ActionFunctionArgs): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const submission = checkInSeriesSetUpSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!submission.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    return this.respondToSetUp(
      await this.options.setUpCheckInSeries.execute(submission.data),
    );
  }

  async change(
    args: ActionFunctionArgs,
    seriesId: string | undefined,
  ): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const id = idSchema.safeParse(seriesId);

    if (!id.success) {
      return this.unknownSeries();
    }

    const submission = checkInSeriesChangeSchema.safeParse(
      await readCheckInBody(args.request),
    );

    if (!submission.success) {
      return refusedCheckIn("invalid_request", { status: UNPROCESSABLE });
    }

    return this.respondToChange(
      await this.options.changeCheckInSeries.execute({
        seriesId: id.data,
        ...submission.data,
      }),
    );
  }

  async stop(
    args: ActionFunctionArgs,
    seriesId: string | undefined,
  ): Promise<Response> {
    requirePortalAccess(args, { role: "COACH" });

    const id = idSchema.safeParse(seriesId);

    if (!id.success) {
      return this.unknownSeries();
    }

    return this.respondToStop(
      await this.options.stopCheckInSeries.execute({ seriesId: id.data }),
    );
  }

  private respondToPreview(result: PreviewCheckInSeriesResult): Response {
    switch (result.status) {
      case "previewed":
        return Response.json(
          checkInSeriesPreviewSchema.parse({
            weekdays: result.weekdays,
            hours: result.hours.map(({ hour, occurrences, clashes }) => ({
              hour,
              weeks: occurrences,
              clashes,
            })),
          }),
          { headers: { "Cache-Control": "no-store" } },
        );
      case "unknown_client":
        return unknownClient();
      case "client_cannot_answer":
        return refusedCheckIn(result.status);
    }
  }

  private respondToSetUp(result: SetUpCheckInSeriesResult): Response {
    switch (result.status) {
      case "set_up":
        return this.outcome(
          { status: "set_up", seriesId: result.series.id },
          CREATED,
        );
      case "unknown_client":
        return unknownClient();
      case "series_exists":
      case "client_cannot_answer":
      case "outside_availability":
      case "nothing_to_create":
        return refusedCheckIn(result.status);
    }
  }

  private respondToChange(result: ChangeCheckInSeriesResult): Response {
    switch (result.status) {
      case "changed":
        return this.outcome(
          { status: "changed", seriesId: result.series.id },
          OK,
        );
      case "unknown_series":
        return this.unknownSeries();
      case "outside_availability":
      case "client_cannot_answer":
      case "changed_meanwhile":
        return refusedCheckIn(result.status);
    }
  }

  private respondToStop(result: StopCheckInSeriesResult): Response {
    switch (result.status) {
      case "stopped":
        return this.outcome(
          { status: "stopped", seriesId: result.series.id },
          OK,
        );
      case "unknown_series":
        return this.unknownSeries();
      case "changed_meanwhile":
        return refusedCheckIn(result.status);
    }
  }

  private outcome(reply: CheckInSeriesOutcomeReply, status: number): Response {
    return Response.json(checkInSeriesOutcomeSchema.parse(reply), { status });
  }

  private unknownSeries(): Response {
    return new Response("Not Found", { status: 404 });
  }
}
