import type {
  ReadClientInvitationUseCase,
  ResendInvitationUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-invitation";
import type {
  ClientRosterEntry,
  ClientStatus,
  ListClientsUseCase,
  ReadClientRecordUseCase,
} from "~/bounded-contexts/clients/clients/domain/client-roster";
import { readJsonRequestBody } from "~/shared/http/index.server";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";

import {
  clientRosterSchema,
  coachClientSchema,
  resendInvitationErrorSchema,
  resendInvitationRequestSchema,
  resendInvitationSuccessSchema,
  type ClientRoster,
  type CoachClient,
} from "~/bounded-contexts/clients/clients/public/coach-clients";
import { accessContext } from "~/bounded-contexts/access/public/session";

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
  "subscription-cancelled-or-ended": {
    error: "subscription-cancelled-or-ended",
    status: 409,
  },
  failed: { error: "send-failed", status: 503 },
} as const satisfies Record<ResendRefusal, { error: string; status: number }>;

const RESEND_REQUEST_MAX_BYTES = 1024;

type ListedClient = ClientRosterEntry & {
  status: ClientStatus;
  needsRefund: boolean;
};

type ClientRecord = NonNullable<
  Awaited<ReturnType<ReadClientRecordUseCase["execute"]>>
>;

type InvitationRecord = NonNullable<
  Awaited<ReturnType<ReadClientInvitationUseCase["execute"]>>
>;

export class CoachClientsController {
  constructor(private readonly options: CoachClientsControllerOptions) {}

  async loadRoster(args: LoaderFunctionArgs): Promise<ClientRoster> {
    args.context.get(accessContext).requirePortalAccess("COACH");

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
    args.context.get(accessContext).requirePortalAccess("COACH");

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
      coachingCancelledOrEnded: record.coachingCancelledOrEnded,
      gender: record.booking.gender,
      assessmentCall: assessmentCallOf(record),
      invitation: invitationOf(record, invitation),
    });
  }

  async resendInvitation(args: ActionFunctionArgs): Promise<Response> {
    args.context.get(accessContext).requireAccount({ role: "COACH" });

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
    email: client.booking.email,
    status: client.status,
    needsRefund: client.needsRefund,
  };
}

function assessmentCallOf(record: ClientRecord) {
  const { startsAt, ...booking } = record.assessmentCall;

  return { ...booking, startsAt: startsAt.toISOString() };
}

function invitationOf(
  record: ClientRecord,
  invitation: InvitationRecord | null,
) {
  if (record.accountBound || !invitation) {
    return null;
  }

  return {
    state: invitation.state,
    sentAt: invitation.sentAt.toISOString(),
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

function toRosterClient(client: ListedClient) {
  return {
    ...identityOf(client),
    bundleMonths: client.journey.standing.bundleMonths,
    joinedAt: client.joinedAt.toISOString(),
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
