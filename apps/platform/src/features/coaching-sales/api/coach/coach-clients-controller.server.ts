import type {
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
} from "@eli-coach-platform/domain/client-invitation";
import type {
  ClientRosterEntry,
  ClientStatus,
  ListClientsUseCase,
  ReadClientRecordUseCase,
} from "@eli-coach-platform/domain/client-roster";
import { programWorkStart } from "@eli-coach-platform/domain/coaching-subscription";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import { readJsonRequestBody } from "~/features/coaching-sales/api/read-json-request-body.server";
import {
  clientRosterSchema,
  coachClientSchema,
  resendInvitationErrorSchema,
  resendInvitationRequestSchema,
  resendInvitationSuccessSchema,
  type ClientRoster,
  type CoachClient,
} from "~/features/coaching-sales/contracts/coach-clients";

type CoachClientsControllerOptions = {
  listClients: ListClientsUseCase;
  readClientRecord: ReadClientRecordUseCase;
  readClientInvitation: ReadClientInvitationUseCase;
  resendInvitation: ResendInvitationUseCase;
};

type ResendRefusal = Exclude<
  Awaited<ReturnType<ResendInvitationUseCase["execute"]>>["status"],
  "sent"
>;

const RESEND_REFUSALS = {
  "not-found": { error: "not-found", status: 404 },
  "already-admitted": { error: "already-admitted", status: 409 },
  failed: { error: "send-failed", status: 503 },
} as const satisfies Record<ResendRefusal, { error: string; status: number }>;

const RESEND_REQUEST_MAX_BYTES = 1024;

type ListedClient = ClientRosterEntry & { status: ClientStatus };

export class CoachClientsController {
  constructor(private readonly options: CoachClientsControllerOptions) {}

  async loadRoster(args: LoaderFunctionArgs): Promise<ClientRoster> {
    requirePortalAccess(args, { role: "COACH" });

    const listing = await this.options.listClients.execute();

    if (listing.status === "unavailable") {
      return clientRosterSchema.parse({ clients: null });
    }

    return clientRosterSchema.parse({
      clients: listing.clients.map(toRosterClient),
    });
  }

  async loadClient(
    args: LoaderFunctionArgs,
    clientId: string,
  ): Promise<CoachClient> {
    requirePortalAccess(args, { role: "COACH" });

    const id = coachClientSchema.shape.clientId.safeParse(clientId);

    if (!id.success) {
      throw createNotFoundResponse();
    }

    const [record, invitation] = await Promise.all([
      this.options.readClientRecord.execute(id.data),
      this.options.readClientInvitation.execute(id.data),
    ]);

    if (!record) {
      throw createNotFoundResponse();
    }

    return coachClientSchema.parse({
      ...identityOf(record),
      profile: {
        dateOfBirth: record.profile.dateOfBirth,
        gender: record.profile.gender,
        country: record.profile.country,
        phone: record.profile.phone,
        primaryGoal: record.profile.primaryGoal,
        bookingNotes: record.bookingNotes,
      },
      subscription: subscriptionOf(record),
      invitation:
        record.accountBound || !invitation
          ? null
          : {
              state: invitation.state,
              sentAt: invitation.sentAt.toISOString(),
              expiresAt: invitation.expiresAt.toISOString(),
            },
    });
  }

  async resendInvitation(args: ActionFunctionArgs): Promise<Response> {
    requireApiAccount(args, { role: "COACH" });

    const body = await readJsonRequestBody(args.request, {
      maxBytes: RESEND_REQUEST_MAX_BYTES,
    });
    const submission = resendInvitationRequestSchema.safeParse(body);

    if (!submission.success) {
      return errorResponse({ error: "invalid_request", status: 400 });
    }

    const result = await this.options.resendInvitation.execute(
      submission.data.clientId,
    );

    if (result.status === "sent") {
      return Response.json(resendInvitationSuccessSchema.parse(result));
    }

    return errorResponse(RESEND_REFUSALS[result.status]);
  }
}

function identityOf(client: ListedClient) {
  return {
    clientId: client.journey.clientId,
    firstName: client.journey.firstName,
    lastName: client.journey.lastName,
    email: client.profile.email,
    status: client.status,
  };
}

function toRosterClient(client: ListedClient) {
  return {
    ...identityOf(client),
    bundleMonths: client.subscription?.months ?? null,
    paidAt: client.subscription?.paidAt.toISOString() ?? null,
  };
}

function subscriptionOf(client: ListedClient) {
  if (!client.subscription) {
    return null;
  }

  const { bundleId, months, tier, paidAt, startChoice } = client.subscription;

  return {
    bundleId,
    months,
    tier,
    paidAt: paidAt.toISOString(),
    workStartsOn:
      programWorkStart({ startChoice, purchasedAt: paidAt })?.toISOString() ??
      null,
  };
}

function errorResponse(refusal: { error: string; status: number }): Response {
  return Response.json(
    resendInvitationErrorSchema.parse({ error: refusal.error }),
    { status: refusal.status },
  );
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
