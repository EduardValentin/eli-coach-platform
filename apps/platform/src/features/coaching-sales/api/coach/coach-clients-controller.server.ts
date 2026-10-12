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
import type {
  ReadSubscriptionSummaryUseCase,
  RefundDueSnapshot,
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
} from "~/features/coaching-sales/public/coach-clients";

type CoachClientsControllerOptions = {
  listClients: ListClientsUseCase;
  readClientRecord: ReadClientRecordUseCase;
  readClientInvitation: ReadClientInvitationUseCase;
  readSubscriptionSummary: ReadSubscriptionSummaryUseCase;
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

type SubscriptionSummary = NonNullable<
  Awaited<ReturnType<ReadSubscriptionSummaryUseCase["execute"]>>
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

    const summaries = await Promise.all(
      listing.clients.map((client) =>
        this.options.readSubscriptionSummary.execute(client.journey.clientId),
      ),
    );

    return clientRosterSchema.parse({
      clients: listing.clients.map((client, index) =>
        toRosterClient(client, summaries[index] ?? null),
      ),
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

    const [record, invitation, summary] = await Promise.all([
      this.options.readClientRecord.execute(id.data),
      this.options.readClientInvitation.execute(id.data),
      this.options.readSubscriptionSummary.execute(id.data),
    ]);

    if (!record) {
      throw createNotFoundResponse();
    }

    return coachClientSchema.parse({
      ...identityOf(record),
      subscriptionCancelledOrEnded: record.subscriptionCancelledOrEnded,
      gender: record.booking.gender,
      assessmentCall: assessmentCallOf(record),
      subscription: summary ? subscriptionOf(summary) : null,
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

function toRosterClient(
  client: ListedClient,
  summary: SubscriptionSummary | null,
) {
  return {
    ...identityOf(client),
    bundleMonths: summary?.subscription.months ?? null,
    paidAt: summary?.subscription.paidAt.toISOString() ?? null,
  };
}

function subscriptionOf(summary: SubscriptionSummary) {
  const { subscription, status: subscriptionStatus } = summary;
  const accessEndsOn = subscription.accessEndsAt?.toISOString() ?? null;

  return {
    bundleId: subscription.bundleId,
    months: subscription.months,
    reducedPrice: subscription.tier === "reduced",
    paidAt: subscription.paidAt.toISOString(),
    workStartsOn: summary.workStartsOn?.toISOString() ?? null,
    status: subscriptionStatus,
    endsOn: subscriptionStatus === "cancelled" ? accessEndsOn : null,
    endedOn: subscriptionStatus === "ended" ? accessEndsOn : null,
    refund: subscription.refund
      ? refundOf(subscription.refund, {
          currency: subscription.currency,
          outstandingCents: summary.refundOutstandingCents ?? 0,
        })
      : null,
  };
}

function refundOf(
  refund: RefundDueSnapshot,
  reading: { currency: string; outstandingCents: number },
) {
  return {
    reason: refund.reason,
    amountCents: refund.amountCents,
    outstandingCents: reading.outstandingCents,
    refundedCents: refund.refundedCents,
    currency: reading.currency,
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
