import type {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
  ReadProgramStatusUseCase,
} from "@eli-coach-platform/domain/client-journey";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientIdentitySchema,
  programStatusSchema,
  welcomePageSchema,
  type ClientIdentity,
  type ProgramStatus,
  type WelcomePage,
} from "~/features/coaching-sales/contracts/client-journey";
import { CLIENT_ONBOARDING_PATH } from "~/features/coaching-sales/contracts/paths";
import { clientJourneyContext } from "~/features/coaching-sales/server/guards/client-journey-context.server";

type ClientJourneyControllerOptions = {
  markWelcomeSeen: MarkWelcomeSeenUseCase;
  readClientJourney: ReadClientJourneyUseCase;
  readProgramStatus: ReadProgramStatusUseCase;
};

export class ClientJourneyController {
  constructor(private readonly options: ClientJourneyControllerOptions) {}

  async loadWelcome(args: LoaderFunctionArgs): Promise<WelcomePage> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const journey = await this.options.readClientJourney.execute(
      client.authSubjectId,
    );

    if (!journey) {
      throw createNotFoundResponse();
    }

    return welcomePageSchema.parse({
      firstName: journey.firstName,
      wording: journey.welcomeWording(),
    });
  }

  loadIdentity(args: LoaderFunctionArgs): ClientIdentity | null {
    const journey = args.context.get(clientJourneyContext);

    if (!journey) {
      return null;
    }

    return clientIdentitySchema.parse({
      firstName: journey.firstName,
      lastName: journey.lastName,
    });
  }

  async loadProgramStatus(
    args: LoaderFunctionArgs,
  ): Promise<ProgramStatus | null> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const status = await this.options.readProgramStatus.execute(
      client.authSubjectId,
    );

    if (!status) {
      return null;
    }

    return programStatusSchema.parse({
      kind: status.kind,
      submittedAt: status.submittedAt.toISOString(),
      workStartsOn: status.workStartsOn?.toISOString() ?? null,
      startNowUntil: status.startNowUntil?.toISOString() ?? null,
      paymentProblem: status.paymentProblem,
    });
  }

  async markWelcomeSeen(args: ActionFunctionArgs): Promise<Response> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const result = await this.options.markWelcomeSeen.execute(
      client.authSubjectId,
    );

    if (result.status === "not-on-journey") {
      throw createNotFoundResponse();
    }

    return redirect(CLIENT_ONBOARDING_PATH);
  }
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
