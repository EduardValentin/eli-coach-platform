import type {
  ProgramCardReading,
  ProgramIncidentsPort,
  ReadProgramCardUseCase,
  ReadProgramDraftUseCase,
  ReadProgramSetupUseCase,
  SaveProgramDraftResult,
  SaveProgramDraftUseCase,
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
  PROGRAM_DRAFT_REFUSALS,
  programDraftRefusalSchema,
  programDraftSavedAnswerSchema,
  programDraftSaveRequestSchema,
  type ProgramDraftView,
} from "~/bounded-contexts/programs/training-programs/public/program-draft";
import {
  programSetupChoices,
  programSetupRequestSchema,
  type ProgramCreateOutcome,
  type ProgramSetupView,
} from "~/bounded-contexts/programs/training-programs/public/program-setup";
import type { UnitOfWork } from "~/shared/http/unit-of-work";
import { accessContext } from "~/bounded-contexts/access/public/session";
import {
  programBuilderPath,
  programSetupPath,
} from "~/bounded-contexts/programs/training-programs/public/paths";
import { coachClientPath } from "~/bounded-contexts/clients/public/paths";

type CoachProgramControllerOptions = {
  readProgramCardUseCase: ReadProgramCardUseCase;
  readProgramSetupUseCase: ReadProgramSetupUseCase;
  startProgramUseCase: StartProgramUseCase;
  readProgramDraftUseCase: ReadProgramDraftUseCase;
  saveProgramDraftUseCase: SaveProgramDraftUseCase;
  unitOfWork: UnitOfWork;
  programIncidentsPort: ProgramIncidentsPort;
};

type ProgramReading = Extract<ProgramCardReading, { status: "program" }>;

type StartCommand = Parameters<StartProgramUseCase["execute"]>[0];

type DraftRefusal = (typeof PROGRAM_DRAFT_REFUSALS)[number];

const PROGRAM_SETUP_REQUEST_MAX_BYTES = 16 * 1024;

const PROGRAM_DRAFT_REQUEST_MAX_BYTES = 1024 * 1024;

const DRAFT_REFUSAL_STATUS: Record<DraftRefusal, number> = {
  "changed-elsewhere": 409,
  "not-a-draft": 409,
  "level-and-language-fixed": 409,
  "no-program": 404,
};

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
        throw redirect(programBuilderPath(target));
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
        throw redirect(programBuilderPath(target));
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

  async loadDraft(
    args: LoaderFunctionArgs,
    clientId: string | undefined,
  ): Promise<ProgramDraftView> {
    const coach = args.context.get(accessContext).requirePortalAccess("COACH");
    const target = this.requireClientId(clientId);
    const reading = await this.options.readProgramDraftUseCase.execute({
      clientId: target,
      coachAccountId: coach.id,
    });

    switch (reading.status) {
      case "unknown-client":
        throw this.notFoundResponse();
      case "no-draft":
        throw redirect(coachClientPath(target));
      case "no-program":
        return { state: "no-program", client: reading.client };
      case "draft": {
        const { client, coachingEnded, level, language, draft } = reading;

        return {
          state: "draft",
          client,
          coachingEnded,
          level,
          language,
          versionNumber: draft.versionNumber,
          content: draft.content,
          updatedAt: draft.updatedAt.toISOString(),
          blockSetup: reading.blockSetup,
          cardioExercises: reading.cardioExercises,
        };
      }
    }
  }

  async saveDraft(
    args: ActionFunctionArgs,
    clientId: string | undefined,
  ): Promise<Response> {
    args.context.get(accessContext).requirePortalAccess("COACH");
    const target = this.requireClientId(clientId);
    const request = programDraftSaveRequestSchema.safeParse(
      await readJsonRequestBody(args.request, {
        maxBytes: PROGRAM_DRAFT_REQUEST_MAX_BYTES,
      }),
    );

    if (!request.success) {
      return createBadRequestResponse("The program draft could not be read.");
    }

    const { updatedAt, ...draft } = request.data;
    const result = await this.options.unitOfWork(() =>
      this.options.saveProgramDraftUseCase.execute({
        clientId: target,
        ...draft,
        expectedUpdatedAt: new Date(updatedAt),
      }),
    );

    return this.draftSaveResponse(result);
  }

  private draftSaveResponse(result: SaveProgramDraftResult): Response {
    switch (result.status) {
      case "saved":
        return Response.json(
          programDraftSavedAnswerSchema.parse({
            status: "saved",
            updatedAt: result.updatedAt.toISOString(),
          }),
        );
      case "not-well-formed":
        return createBadRequestResponse(
          "The program draft is not well formed.",
        );
      case "unknown-client":
        return this.notFoundResponse();
      default:
        return Response.json(
          programDraftRefusalSchema.parse({ error: result.status }),
          { status: DRAFT_REFUSAL_STATUS[result.status] },
        );
    }
  }

  private async startInUnitOfWork(
    command: StartCommand,
  ): Promise<StartProgramResult | { status: "failed" }> {
    try {
      return await this.options.unitOfWork(() =>
        this.options.startProgramUseCase.execute(command),
      );
    } catch (error) {
      this.options.programIncidentsPort.programStartFailed({
        clientId: command.clientId,
        error,
      });

      return { status: "failed" };
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
