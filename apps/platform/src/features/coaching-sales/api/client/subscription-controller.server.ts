import { joinBasePath } from "@eli-coach-platform/config";
import type {
  CancelSubscriptionUseCase,
  OpenPaymentMethodSessionUseCase,
  ReadClientSubscriptionUseCase,
  StartProgramNowUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import {
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import { requireApiAccount } from "~/features/accounts/server/guards/require-account.server";
import { requirePortalAccess } from "~/features/accounts/server/guards/require-portal-access.server";
import {
  clientEndedSchema,
  clientSettingsSchema,
  NOTHING_TO_CANCEL_MESSAGE,
  PAYMENT_METHOD_UNAVAILABLE_PARAM,
  programStartedSchema,
  subscriptionCancelledSchema,
  subscriptionRefusalSchema,
  type ClientEnded,
  type ClientSettings,
  type SubscriptionRefusalAnswer,
} from "~/features/coaching-sales/contracts/client-subscription";
import {
  CLIENT_ENDED_PATH,
  CLIENT_SETTINGS_PATH,
} from "~/features/coaching-sales/contracts/paths";

type SubscriptionControllerOptions = {
  appBasePath: string;
  cancelSubscription: CancelSubscriptionUseCase;
  openPaymentMethodSession: OpenPaymentMethodSessionUseCase;
  publicAppUrl: string;
  readClientSubscription: ReadClientSubscriptionUseCase;
  startProgramNow: StartProgramNowUseCase;
};

type SubscriptionReading = NonNullable<
  Awaited<ReturnType<ReadClientSubscriptionUseCase["execute"]>>
>;

type CancelRefusal = Exclude<
  Awaited<ReturnType<CancelSubscriptionUseCase["execute"]>>["status"],
  "cancelled"
>;

type Refusal = { answer: SubscriptionRefusalAnswer; status: number };

const CANCEL_REFUSALS: Record<CancelRefusal, Refusal> = {
  nothing_to_cancel: {
    answer: { error: "nothing-to-cancel", message: NOTHING_TO_CANCEL_MESSAGE },
    status: 409,
  },
  provider_unavailable: {
    answer: { error: "provider-unavailable" },
    status: 503,
  },
  not_found: { answer: { error: "not-found" }, status: 404 },
};

const NOT_FOUND: Refusal = { answer: { error: "not-found" }, status: 404 };
const CONFLICT = 409;
const SEE_OTHER = 303;

export class SubscriptionController {
  constructor(private readonly options: SubscriptionControllerOptions) {}

  async loadSettings(args: LoaderFunctionArgs): Promise<ClientSettings> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const reading = await this.options.readClientSubscription.execute(
      client.authSubjectId,
    );

    if (!reading) {
      throw createNotFoundResponse();
    }

    return clientSettingsSchema.parse(settingsOf(reading));
  }

  async loadEnded(args: LoaderFunctionArgs): Promise<ClientEnded> {
    const client = requirePortalAccess(args, { role: "CLIENT" });
    const reading = await this.options.readClientSubscription.execute(
      client.authSubjectId,
    );

    return clientEndedSchema.parse({
      refundDue: reading?.refundDue ?? false,
    });
  }

  async cancel(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const result = await this.options.cancelSubscription.execute(
      client.authSubjectId,
    );

    if (result.status !== "cancelled") {
      return refusalResponse(CANCEL_REFUSALS[result.status]);
    }

    return Response.json(
      subscriptionCancelledSchema.parse({
        status: "cancelled",
        rule: result.rule,
        accessEndsAt: result.subscription.accessEndsAt?.toISOString(),
        refundDue: result.refundDue,
      }),
    );
  }

  async startNow(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const result = await this.options.startProgramNow.execute(
      client.authSubjectId,
    );

    if (result.status === "started") {
      return Response.json(programStartedSchema.parse(result));
    }

    if (result.status === "refused") {
      return refusalResponse({
        answer: { error: result.reason },
        status: CONFLICT,
      });
    }

    return refusalResponse(NOT_FOUND);
  }

  async openPaymentMethod(args: ActionFunctionArgs): Promise<Response> {
    const client = requireApiAccount(args, { role: "CLIENT" });
    const result = await this.options.openPaymentMethodSession.execute({
      authSubjectId: client.authSubjectId,
      returnUrl: this.publicUrl(CLIENT_SETTINGS_PATH),
    });

    switch (result.status) {
      case "opened":
        return redirect(result.url, SEE_OTHER);
      case "ended":
        return redirect(CLIENT_ENDED_PATH, SEE_OTHER);
      case "provider_unavailable":
        return redirect(paymentMethodUnavailablePath(), SEE_OTHER);
      case "not_found":
        throw createNotFoundResponse();
    }
  }

  private publicUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}

function settingsOf(reading: SubscriptionReading) {
  const { subscription } = reading;

  return {
    subscription: {
      bundleId: subscription.bundleId,
      months: subscription.months,
      amountCents: subscription.amountCents,
      currency: subscription.currency,
      paidAt: subscription.paidAt.toISOString(),
      status: reading.status,
      cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
      accessEndsAt: subscription.accessEndsAt?.toISOString() ?? null,
      paymentProblem: reading.paymentProblem,
    },
    cancellation: cancellationOf(reading),
    startNowUntil: reading.startNowUntil?.toISOString() ?? null,
  };
}

function cancellationOf(reading: SubscriptionReading) {
  const dates = {
    withdrawalDeadline: reading.withdrawalDeadline.toISOString(),
    paidThrough: reading.paidThrough.toISOString(),
  };

  switch (reading.cancellationRule) {
    case "full-refund":
      return {
        rule: reading.cancellationRule,
        ...dates,
        refundCents: reading.refundOnCancellationCents,
      };
    case "no-refund":
      return { rule: reading.cancellationRule, ...dates };
    case "none":
      return null;
  }
}

function paymentMethodUnavailablePath(): string {
  const query = new URLSearchParams({
    [PAYMENT_METHOD_UNAVAILABLE_PARAM.name]:
      PAYMENT_METHOD_UNAVAILABLE_PARAM.value,
  });

  return `${CLIENT_SETTINGS_PATH}?${query}`;
}

function refusalResponse(refusal: Refusal): Response {
  return Response.json(subscriptionRefusalSchema.parse(refusal.answer), {
    status: refusal.status,
  });
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
