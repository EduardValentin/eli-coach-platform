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
import {
  CoachingSubscription,
  RefundDue,
  type RefundDueSnapshot,
} from "@eli-coach-platform/domain/coaching-subscription";
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
  "coaching-closed": { error: "coaching-closed", status: 409 },
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
      coachingClosed: hasClosedCoaching(record),
      gender: record.booking.gender,
      assessmentCall: assessmentCallOf(record),
      subscription: subscriptionOf(record),
      invitation: invitationOf(record, invitation),
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
    email: client.booking.email,
    status: client.status,
    needsRefund: client.needsRefund,
  };
}

function hasClosedCoaching(record: ClientRecord): boolean {
  const status = record.subscriptionStatus;

  return status ? CoachingSubscription.hasClosedCoaching({ status }) : false;
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
    bundleMonths: client.subscription?.months ?? null,
    paidAt: client.subscription?.paidAt.toISOString() ?? null,
  };
}

function subscriptionOf(record: ClientRecord) {
  if (!record.subscription) {
    return null;
  }

  const { subscription, subscriptionStatus } = record;
  const accessEndsOn = subscription.accessEndsAt?.toISOString() ?? null;

  return {
    bundleId: subscription.bundleId,
    months: subscription.months,
    reducedPrice: subscription.tier === "reduced",
    paidAt: subscription.paidAt.toISOString(),
    workStartsOn: record.workStartsOn?.toISOString() ?? null,
    status: subscriptionStatus,
    endsOn: subscriptionStatus === "cancelled" ? accessEndsOn : null,
    endedOn: subscriptionStatus === "ended" ? accessEndsOn : null,
    refund: subscription.refund
      ? refundOf(subscription.refund, subscription.currency)
      : null,
  };
}

function refundOf(refund: RefundDueSnapshot, currency: string) {
  return {
    reason: refund.reason,
    amountCents: refund.amountCents,
    outstandingCents: RefundDue.reconstitute(refund).outstandingCents(),
    refundedCents: refund.refundedCents,
    currency,
    dueBy: refund.dueBy?.toISOString() ?? null,
    refundedOn: refund.refundedAt?.toISOString() ?? null,
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
