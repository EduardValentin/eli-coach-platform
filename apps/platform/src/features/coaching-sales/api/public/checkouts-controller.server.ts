import { joinBasePath } from "@eli-coach-platform/config";
import {
  COACHING_BUNDLES,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import {
  withdrawalDeadline,
  type ReadCheckoutConfirmationUseCase,
  type StartCheckoutUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type {
  CoachingSalesWindow,
  ResolvePaymentLinkUseCase,
} from "@eli-coach-platform/domain/payment-link";
import type { Clock } from "@eli-coach-platform/domain/shared";
import {
  createBadRequestResponse,
  readFormDataRequestBody,
  readTextRequestBody,
} from "@eli-coach-platform/infrastructure/http/server";
import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";

import {
  coachingBundleIdSchema,
  presentBundleCards,
  type CoachingBundleCard,
} from "~/features/coaching-sales/contracts/bundle-cards";
import { presentPaidConfirmation } from "~/features/coaching-sales/contracts/checkout-confirmation";
import {
  bundlePageRequestSchema,
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
  salesWindow: CoachingSalesWindow;
  startCheckout: StartCheckoutUseCase;
};

type PaymentLinkResolution = Awaited<
  ReturnType<ResolvePaymentLinkUseCase["execute"]>
>;

type OpenPaymentLinkResolution = Exclude<
  PaymentLinkResolution,
  { status: "closed" }
>;

const BUNDLE_PAGE_REQUEST_MAX_BYTES = 1024;
const CHECKOUT_FORM_MAX_BYTES = 4096;
const CHECKOUT_SESSION_ID_PLACEHOLDER = "{CHECKOUT_SESSION_ID}";
const SEE_OTHER = 303;
const UNCACHED_PAGE_HEADERS = { "Cache-Control": "no-store" };
const CONFIRMATION_PAGE_HEADERS = {
  ...UNCACHED_PAGE_HEADERS,
  "Referrer-Policy": "no-referrer",
};

export class CheckoutsController {
  constructor(private readonly options: CheckoutsControllerOptions) {}

  async loadBundlePageShell() {
    if (!(await this.options.salesWindow.isOpen())) {
      throw createNotFoundResponse();
    }

    return data(null, { headers: UNCACHED_PAGE_HEADERS });
  }

  async resolveBundlePage({ request }: ActionFunctionArgs): Promise<Response> {
    const submission = bundlePageRequestSchema.safeParse(
      await readJsonRequestBody(request),
    );

    if (!submission.success) {
      return createBadRequestResponse("The payment link could not be read.");
    }

    const link = await this.options.resolvePaymentLink.execute(
      submission.data.token,
    );

    if (link.status === "closed") {
      return createNotFoundResponse();
    }

    return Response.json(this.presentBundlePage(link), {
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

  private presentBundlePage(link: OpenPaymentLinkResolution) {
    const page =
      link.status === "valid"
        ? {
            state: "valid",
            tier: link.tier,
            cards: this.loadPricingCards({ tier: link.tier }),
            waitingStartsOn: withdrawalDeadline(
              this.options.clock.now(),
            ).toISOString(),
          }
        : {
            state: "call-first",
            cards: this.loadPricingCards({ tier: "regular" }),
          };

    return bundlePageSchema.parse(page);
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
    return redirect(path, SEE_OTHER);
  }

  private publicUrl(path: string): string {
    return new URL(
      joinBasePath(this.options.appBasePath, path),
      this.options.publicAppUrl,
    ).toString();
  }
}

async function readJsonRequestBody(request: Request): Promise<unknown> {
  const body = await readTextRequestBody(request, {
    maxBytes: BUNDLE_PAGE_REQUEST_MAX_BYTES,
  });

  if (body.status !== "valid") {
    return undefined;
  }

  try {
    return JSON.parse(body.text);
  } catch {
    return undefined;
  }
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}
