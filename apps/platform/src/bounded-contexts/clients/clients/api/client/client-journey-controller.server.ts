import type {
  MarkWelcomeSeenUseCase,
  ReadClientJourneyUseCase,
} from "@eli-coach-platform/domain/client-journey";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { requirePortalAccess } from "~/bounded-contexts/access/accounts/server/guards/require-portal-access.server";
import {
  clientIdentitySchema,
  welcomePageSchema,
  type ClientIdentity,
  type WelcomePage,
} from "~/bounded-contexts/clients/clients/public/client-journey";
import { CLIENT_ONBOARDING_PATH } from "~/bounded-contexts/clients/clients/public/paths";
import { clientJourneyContext } from "~/bounded-contexts/clients/clients/server/guards/client-journey-context.server";

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
