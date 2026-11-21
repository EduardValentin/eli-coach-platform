import type {
  ProgramCardReading,
  ProgramIncidentsPort,
  ReadProgramCardUseCase,
  ReadProgramSetupUseCase,
  StartProgramResult,
  StartProgramUseCase,
} from "~/bounded-contexts/programs/training-programs/domain/program";
import {
  createBadRequestResponse,
  readJsonRequestBody,
} from "~/shared/http/index.server";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { z } from "zod";

import {
  presentProgramCardDraft,
  presentStillMissing,
  type ProgramCardView,
} from "~/bounded-contexts/programs/training-programs/public/program-card";
import {
  programSetupChoices,
  programSetupRequestSchema,
  type ProgramCreateOutcome,
  type ProgramSetupView,
} from "~/bounded-contexts/programs/training-programs/public/program-setup";
import type { UnitOfWork } from "~/shared/http/unit-of-work";
import { accessContext } from "~/bounded-contexts/access/public/session";
import { programSetupPath } from "~/bounded-contexts/programs/training-programs/public/paths";
import { coachClientPath } from "~/bounded-contexts/clients/public/paths";

type CoachProgramControllerOptions = {
  readProgramCardUseCase: ReadProgramCardUseCase;
  readProgramSetupUseCase: ReadProgramSetupUseCase;
  startProgramUseCase: StartProgramUseCase;
  unitOfWork: UnitOfWork;
  programIncidentsPort: ProgramIncidentsPort;
};

type ProgramReading = Extract<ProgramCardReading, { status: "program" }>;

type StartCommand = Parameters<StartProgramUseCase["execute"]>[0];

const PROGRAM_SETUP_REQUEST_MAX_BYTES = 16 * 1024;

const clientIdSchema = z.uuid();

export class CoachProgramController {
  constructor(private readonly options: CoachProgramControllerOptions) {}

  async loadCard(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<ProgramCardView> {
    const target = this.requireCoachClientId(args, clientId);
    const reading = await this.options.readProgramCardUseCase.execute({
      clientId: target,
    });

    switch (reading.status) {
      case "unknown-client":
        throw this.notFoundResponse();
      case "program":
        return this.draftCard(reading);
      case "waiting":
      case "ready-to-build":
      case "coaching-ended":
        return { state: reading.status, gender: reading.gender };
    }
  }

  async loadSetup(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<ProgramSetupView> {
    const target = this.requireCoachClientId(args, clientId);
    const reading = await this.options.readProgramSetupUseCase.execute({
      clientId: target,
    });

    switch (reading.status) {
      case "unknown-client":
        throw this.notFoundResponse();
      case "has-program":
      case "coaching-ended":
        throw redirect(coachClientPath(target));
      case "not-approved":
        return { state: "not-ready", client: reading.client };
      case "ready":
        return {
          state: "ready",
          client: reading.client,
          startingValues: {
            ...reading.startingValues,
            equipment: [...reading.startingValues.equipment],
          },
          choices: programSetupChoices(reading),
        };
    }
  }

  async create(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<ProgramCreateOutcome> {
    const coach = args.context.get(accessContext).requirePortalAccess("COACH");
    const target = this.requireClientId(clientId);
    const setup = programSetupRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: PROGRAM_SETUP_REQUEST_MAX_BYTES,
      }),
    );

    if (!setup.success) {
      throw createBadRequestResponse("The program setup could not be read.");
    }

    const result = await this.startInUnitOfWork({
      coachAccountId: coach.id,
      clientId: target,
      setup: setup.data,
    });

    switch (result.status) {
      case "started":
      case "has-program":
      case "coaching-ended":
        throw redirect(coachClientPath(target));
      case "not-approved":
        throw redirect(programSetupPath(target));
      case "unknown-client":
        throw this.notFoundResponse();
      case "invalid":
        return { status: "invalid", problems: result.problems };
      case "failed":
        return { status: "failed" };
    }
  }

  private async startInUnitOfWork(
    command: StartCommand,
  ): Promise<StartProgramResult | { status: "failed" }> {
    const start = { recordedItsFailure: false };

    try {
      return await this.options.unitOfWork(() =>
        this.startRecordingFailure(command, start),
      );
    } catch (error) {
      if (!start.recordedItsFailure) {
        this.options.programIncidentsPort.programStartFailed({
          clientId: command.clientId,
          error,
        });
      }

      return { status: "failed" };
    }
  }

  // The start records its own failure, so only a unit of work that fails
  // around it (to begin or to commit) is recorded here.
  private async startRecordingFailure(
    command: StartCommand,
    start: { recordedItsFailure: boolean },
  ): Promise<StartProgramResult> {
    try {
      return await this.options.startProgramUseCase.execute(command);
    } catch (error) {
      start.recordedItsFailure = true;
      throw error;
    }
  }

  private draftCard({
    gender,
    coachingEnded,
    draft,
  }: ProgramReading): ProgramCardView {
    // Every program holds a draft until publishing exists (story 4), which
    // brings the card's published state with it.
    if (!draft) {
      throw new Error("The program has no draft to show on the card.");
    }

    if (coachingEnded) {
      return {
        state: "draft-coaching-ended",
        gender,
        draft: presentProgramCardDraft(draft),
      };
    }

    return {
      state: "draft",
      gender,
      draft: presentProgramCardDraft(draft),
      stillMissing: presentStillMissing(draft),
    };
  }

  private requireCoachClientId(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): string {
    args.context.get(accessContext).requirePortalAccess("COACH");

    return this.requireClientId(clientId);
  }

  private requireClientId(clientId: string | undefined): string {
    const target = clientIdSchema.safeParse(clientId);

    if (!target.success) {
      throw this.notFoundResponse();
    }

    return target.data;
  }

  private notFoundResponse(): Response {
    return new Response("Not Found", { status: 404 });
  }
}
