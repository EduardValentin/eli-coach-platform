import type {
  ReadCheckoutConfirmationUseCase,
  StartCheckoutUseCase,
} from "@eli-coach-platform/domain/coaching-subscription";
import type { ResolvePaymentLinkUseCase } from "@eli-coach-platform/domain/payment-link";
import { describe, expect, it, vi } from "vitest";

import { createRequestArgs } from "~/server/test-support/request-args";

import { CheckoutsController } from "./checkouts-controller.server";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const TOKEN = "tok_valid_payment_link_token";
const APP_BASE_PATH = "/coaching";
const PUBLIC_APP_URL = "https://evoa.example";
const PROVIDER_URL = "https://checkout.stripe.com/c/pay/cs_test_1";

type Resolution = Awaited<ReturnType<ResolvePaymentLinkUseCase["execute"]>>;
type CheckoutStart = Awaited<ReturnType<StartCheckoutUseCase["execute"]>>;
type Confirmation = Awaited<
  ReturnType<ReadCheckoutConfirmationUseCase["execute"]>
>;

type ControllerOptions = {
  checkout?: CheckoutStart;
  confirmation?: Confirmation;
  resolution?: Resolution;
};

const validResolution = {
  status: "valid",
  link: { id: "link-1" },
  call: { id: "call-1", visitorEmail: "ana@example.com" },
  tier: "reduced",
} as unknown as Resolution;

describe("CheckoutsController bundle page", () => {
  it("serves the valid page with the tier's cards and the waiting start day only", async () => {
    // arrange
    const { controller, resolvePaymentLink } = createController({
      resolution: validResolution,
    });

    // act
    const page = await controller.loadBundlePage(
      pageArgs(`/select-bundle?token=${TOKEN}`),
    );

    // assert
    expect(resolvePaymentLink).toHaveBeenCalledWith(TOKEN);
    expect(Object.keys(page.data).sort()).toEqual([
      "cards",
      "state",
      "tier",
      "waitingStartsOn",
    ]);
    expect(page.data).toMatchObject({
      state: "valid",
      tier: "reduced",
      waitingStartsOn: "2026-10-10",
    });
    expect(
      page.data.cards.map((card) => [card.id, card.pricePerMonth]),
    ).toEqual([
      ["1-month", 139],
      ["3-months", 125],
      ["6-months", 119],
    ]);
    expect(new Headers(page.init?.headers).get("Cache-Control")).toBe(
      "no-store",
    );
  });

  it("serves the call-first page with the regular cards for a link that does not work", async () => {
    // arrange
    const { controller } = createController({
      resolution: { status: "invalid" },
    });

    // act
    const page = await controller.loadBundlePage(
      pageArgs(`/select-bundle?token=${TOKEN}`),
    );

    // assert
    expect(page.data.state).toBe("call-first");
    expect(Object.keys(page.data).sort()).toEqual(["cards", "state"]);
    expect(page.data.cards.map((card) => card.pricePerMonth)).toEqual([
      159, 149, 139,
    ]);
    expect(new Headers(page.init?.headers).get("Cache-Control")).toBe(
      "no-store",
    );
  });

  it("reads an oversized token as no token at all", async () => {
    // arrange
    const { controller, resolvePaymentLink } = createController({
      resolution: { status: "invalid" },
    });

    // act
    await controller.loadBundlePage(
      pageArgs(`/select-bundle?token=${"a".repeat(300)}`),
    );

    // assert
    expect(resolvePaymentLink).toHaveBeenCalledWith("");
  });

  it("answers not found while coaching sales are closed", async () => {
    // arrange
    const { controller } = createController({
      resolution: { status: "closed" },
    });

    // act
    const loading = controller.loadBundlePage(
      pageArgs(`/select-bundle?token=${TOKEN}`),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });
});

describe("CheckoutsController pricing cards", () => {
  it("presents the cards of the tier it is given", () => {
    // arrange
    const { controller } = createController({});

    // act
    const cards = controller.loadPricingCards({ tier: "reduced" });

    // assert
    expect(cards.map((card) => card.total)).toEqual([139, 375, 714]);
  });
});

describe("CheckoutsController checkout start", () => {
  it("redirects to the provider with return addresses built from the configured app url", async () => {
    // arrange
    const { controller, startCheckout } = createController({
      checkout: { status: "redirect", url: PROVIDER_URL },
    });

    // act
    const response = await controller.startCheckout(
      checkoutArgs({
        bundleId: "6-months",
        startChoice: "waiting",
        token: TOKEN,
      }),
    );

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(PROVIDER_URL);
    expect(startCheckout).toHaveBeenCalledWith({
      rawToken: TOKEN,
      bundleId: "6-months",
      startChoice: "waiting",
      successUrl:
        "https://evoa.example/coaching/checkout/complete?session={CHECKOUT_SESSION_ID}",
      cancelUrl: `https://evoa.example/coaching/select-bundle?token=${TOKEN}&payment=cancelled&bundle=6-months&start=waiting`,
    });
  });

  it("answers not found while coaching sales are closed", async () => {
    // arrange
    const { controller } = createController({
      checkout: { status: "closed" },
    });

    // act
    const response = await controller.startCheckout(
      checkoutArgs({
        bundleId: "1-month",
        startChoice: "immediate",
        token: TOKEN,
      }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it.each(["invalid_link", "unknown_bundle"] as const)(
    "returns to the bundle page for the link when the checkout answers %s",
    async (status) => {
      // arrange
      const { controller } = createController({ checkout: { status } });

      // act
      const response = await controller.startCheckout(
        checkoutArgs({
          bundleId: "1-month",
          startChoice: "immediate",
          token: TOKEN,
        }),
      );

      // assert
      expect(response.status).toBe(303);
      expect(response.headers.get("Location")).toBe(
        `/coaching/select-bundle?token=${TOKEN}`,
      );
    },
  );

  it("returns to the bundle page with the chosen bundle when the start choice is missing", async () => {
    // arrange
    const { controller, resolvePaymentLink, startCheckout } = createController({
      resolution: validResolution,
    });

    // act
    const response = await controller.startCheckout(
      checkoutArgs({ bundleId: "6-months", token: TOKEN }),
    );

    // assert
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      `/coaching/select-bundle?token=${TOKEN}&bundle=6-months`,
    );
    expect(resolvePaymentLink).toHaveBeenCalledWith(TOKEN);
    expect(startCheckout).not.toHaveBeenCalled();
  });

  it("returns to the bundle page without an unknown bundle", async () => {
    // arrange
    const { controller } = createController({ resolution: validResolution });

    // act
    const response = await controller.startCheckout(
      checkoutArgs({
        bundleId: "12-months",
        startChoice: "immediate",
        token: TOKEN,
      }),
    );

    // assert
    expect(response.headers.get("Location")).toBe(
      `/coaching/select-bundle?token=${TOKEN}`,
    );
  });

  it("answers not found for an incomplete checkout while coaching sales are closed", async () => {
    // arrange
    const { controller } = createController({
      resolution: { status: "closed" },
    });

    // act
    const response = await controller.startCheckout(
      checkoutArgs({ token: TOKEN }),
    );

    // assert
    expect(response.status).toBe(404);
  });

  it("refuses a body that is not a form", async () => {
    // arrange
    const { controller, startCheckout } = createController({});
    const request = new Request("https://evoa.example/api/checkouts", {
      body: JSON.stringify({ token: TOKEN }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    // act
    const response = await controller.startCheckout(
      createRequestArgs({ request }),
    );

    // assert
    expect(response.status).toBe(400);
    expect(startCheckout).not.toHaveBeenCalled();
  });
});

describe("CheckoutsController confirmation", () => {
  it("serves the paid readings without caching or a referrer", async () => {
    // arrange
    const { controller, readCheckoutConfirmation } = createController({
      confirmation: {
        status: "paid",
        bundleId: "3-months",
        tier: "reduced",
        amountCents: 37500,
        startChoice: "waiting",
        paidAt: NOW,
        email: "ana@example.com",
        waitingStartsOn: new Date("2026-10-10T10:00:00.000Z"),
      },
    });

    // act
    const page = await controller.loadConfirmation(
      pageArgs("/checkout/complete?session=cs_test_1"),
    );

    // assert
    expect(readCheckoutConfirmation).toHaveBeenCalledWith("cs_test_1");
    expect(page.data).toEqual({
      state: "paid",
      amount: "€375",
      bundleTitle: "3 Months",
      email: "ana@example.com",
      renewalLabel: "Every 3 months",
      startChoice: "waiting",
      waitingStartsOn: "2026-10-10",
    });
    const headers = new Headers(page.init?.headers);
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("serves the call-first state for a session that is not paid", async () => {
    // arrange
    const { controller } = createController({
      confirmation: { status: "not_paid" },
    });

    // act
    const page = await controller.loadConfirmation(
      pageArgs("/checkout/complete?session=cs_test_1"),
    );

    // assert
    expect(page.data).toEqual({ state: "call-first" });
  });

  it("answers not found while coaching sales are closed", async () => {
    // arrange
    const { controller } = createController({
      confirmation: { status: "closed" },
    });

    // act
    const loading = controller.loadConfirmation(
      pageArgs("/checkout/complete?session=cs_test_1"),
    );

    // assert
    await expect(loading).rejects.toMatchObject({ status: 404 });
  });
});

function createController(options: ControllerOptions) {
  const resolvePaymentLink = vi
    .fn()
    .mockResolvedValue(options.resolution ?? { status: "invalid" });
  const startCheckout = vi
    .fn()
    .mockResolvedValue(options.checkout ?? { status: "invalid_link" });
  const readCheckoutConfirmation = vi
    .fn()
    .mockResolvedValue(options.confirmation ?? { status: "not_paid" });
  const controller = new CheckoutsController({
    appBasePath: APP_BASE_PATH,
    clock: { now: () => NOW },
    publicAppUrl: PUBLIC_APP_URL,
    readCheckoutConfirmation: {
      execute: readCheckoutConfirmation,
    } as unknown as ReadCheckoutConfirmationUseCase,
    resolvePaymentLink: {
      execute: resolvePaymentLink,
    } as unknown as ResolvePaymentLinkUseCase,
    startCheckout: {
      execute: startCheckout,
    } as unknown as StartCheckoutUseCase,
  });

  return {
    controller,
    readCheckoutConfirmation,
    resolvePaymentLink,
    startCheckout,
  };
}

function pageArgs(path: string) {
  return createRequestArgs({
    request: new Request(`https://attacker.example${path}`),
  });
}

function checkoutArgs(fields: Record<string, string>) {
  return createRequestArgs({
    request: new Request("https://attacker.example/api/checkouts", {
      body: new URLSearchParams(fields),
      method: "POST",
    }),
  });
}
