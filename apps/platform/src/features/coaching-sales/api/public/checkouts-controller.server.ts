import { joinBasePath } from "@eli-coach-platform/config";
import {
  COACHING_BUNDLES,
  getCoachingBundle,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  withdrawalDeadline,
  type ReadCheckoutConfirmationUseCase,
  type StartCheckoutUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { ResolvePaymentLinkUseCase } from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  createBadRequestResponse,
  readFormDataRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import {
  coachingBundleIdSchema,
  formatEuros,
  presentBundleCards,
  renewalLabel,
  type CoachingBundleCard,
} from "~/features/coaching-sales/contracts/bundle-cards";
import {
  bundlePageSchema,
  checkoutChoiceSchema,
  checkoutConfirmationSchema,
  checkoutSessionIdSchema,
  paymentLinkTokenSchema,
} from "~/features/coaching-sales/contracts/coaching-sales";
import {
  CHECKOUT_COMPLETE_PATH,
  selectBundlePath,
} from "~/features/coaching-sales/contracts/paths";

type CheckoutsControllerOptions = {
  appBasePath: string;
  clock: Clock;
  publicAppUrl: string;
  readCheckoutConfirmation: ReadCheckoutConfirmationUseCase;
  resolvePaymentLink: ResolvePaymentLinkUseCase;
  startCheckout: StartCheckoutUseCase;
};

const CHECKOUT_FORM_MAX_BYTES = 4096;
const CENTS_PER_EURO = 100;
const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";
const SEE_OTHER = 303;
const UNCACHED_PAGE_HEADERS = { "Cache-Control": "no-store" };
const CONFIRMATION_PAGE_HEADERS = {
  ...UNCACHED_PAGE_HEADERS,
  "Referrer-Policy": "no-referrer",
};

export class CheckoutsController {
  constructor(private readonly options: CheckoutsControllerOptions) {}

  async loadBundlePage({ request }: LoaderFunctionArgs) {
    const token = readQueryToken(request);
    const link = await this.options.resolvePaymentLink.execute(token);

    if (link.status === "closed") {
      throw createNotFoundResponse();
    }

    const page =
      link.status === "valid"
        ? {
            state: "valid",
            tier: link.tier,
            cards: this.loadPricingCards({ tier: link.tier }),
            waitingStartsOn: toCalendarDay(
              withdrawalDeadline(this.options.clock.now()),
            ),
          }
        : {
            state: "call-first",
            cards: this.loadPricingCards({ tier: "regular" }),
          };

    return data(bundlePageSchema.parse(page), {
      headers: UNCACHED_PAGE_HEADERS,
    });
  }

  loadPricingCards({ tier }: { tier: PriceTier }): CoachingBundleCard[] {
    return presentBundleCards(COACHING_BUNDLES, tier);
  }

  async startCheckout({ request }: ActionFunctionArgs): Promise<Response> {
    const body = await readFormDataRequestBody(request, {
      maxBytes: CHECKOUT_FORM_MAX_BYTES,
    });

    if (body.status !== "valid") {
      return createBadRequestResponse(
        "The checkout request could not be read.",
      );
    }

    const form = body.formData;
    const token = paymentLinkTokenSchema.parse(form.get("token"));
    const choice = checkoutChoiceSchema.safeParse({
      bundleId: form.get("bundleId"),
      startChoice: form.get("startChoice"),
    });

    if (!choice.success) {
      return this.returnToBundlePage({
        token,
        bundle: coachingBundleIdSchema.safeParse(form.get("bundleId")).data,
      });
    }

    const { bundleId, startChoice } = choice.data;
    const checkout = await this.options.startCheckout.execute({
      rawToken: token,
      bundleId,
      startChoice,
      successUrl: `${this.publicUrl(CHECKOUT_COMPLETE_PATH)}?session=${CHECKOUT_SESSION_ID_PLACEHOLDER}`,
      cancelUrl: this.publicUrl(
        selectBundlePath({
          token,
          payment: "cancelled",
          bundle: bundleId,
          start: startChoice,
        }),
      ),
    });

    if (checkout.status === "redirect") {
      return redirect(checkout.url, SEE_OTHER);
    }

    if (checkout.status === "closed") {
      return createNotFoundResponse();
    }

    return this.redirectInApp(selectBundlePath({ token }));
  }

  async loadConfirmation({ request }: LoaderFunctionArgs) {
    const sessionId = checkoutSessionIdSchema.parse(
      new URL(request.url).searchParams.get("session"),
    );
    const confirmation =
      await this.options.readCheckoutConfirmation.execute(sessionId);

    if (confirmation.status === "closed") {
      throw createNotFoundResponse();
    }

    const page =
      confirmation.status === "paid"
        ? presentPaidConfirmation(confirmation)
        : { state: "call-first" };

    return data(checkoutConfirmationSchema.parse(page), {
      headers: CONFIRMATION_PAGE_HEADERS,
    });
  }

  private async returnToBundlePage(query: {
    token: string;
    bundle?: string;
  }): Promise<Response> {
    const link = await this.options.resolvePaymentLink.execute(query.token);

    if (link.status === "closed") {
      return createNotFoundResponse();
    }

    return this.redirectInApp(selectBundlePath(query));
  }

  private redirectInApp(path: string): Response {
    return redirect(joinBasePath(this.options.appBasePath, path), SEE_OTHER);
  }

  private publicUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}

type PaidCheckout = Extract<
  Awaited<ReturnType<ReadCheckoutConfirmationUseCase["execute"]>>,
  { status: "paid" }
>;

function presentPaidConfirmation(checkout: PaidCheckout) {
  const bundle = getCoachingBundle(checkout.bundleId);

  return {
    state: "paid",
    amount: formatEuros(checkout.amountCents / CENTS_PER_EURO),
    bundleTitle: bundle.title,
    email: checkout.email,
    renewalLabel: renewalLabel(bundle.months),
    startChoice: checkout.startChoice,
    waitingStartsOn: toCalendarDay(checkout.waitingStartsOn),
  };
}

function readQueryToken(request: Request): string {
  return paymentLinkTokenSchema.parse(
    new URL(request.url).searchParams.get("token"),
  );
}

function toCalendarDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
