import type {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
} from "@eli-coach-platform/domain/client-journey";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  welcomePageSchema,
  type WelcomePage,
} from "~/features/coaching-sales/contracts/client-journey";
import { CLIENT_ONBOARDING_PATH } from "~/features/coaching-sales/contracts/paths";

type ClientJourneyControllerOptions = {
  markWelcomeSeen: MarkWelcomeSeenUseCase;
  readClientJourney: ReadClientJourneyUseCase;
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
