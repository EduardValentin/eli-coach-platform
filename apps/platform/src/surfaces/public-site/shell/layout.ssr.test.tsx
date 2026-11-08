import type { PropsWithChildren } from "react";
import { renderToString } from "react-dom/server";
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react-router", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
  SignOutButton: ({ children }: PropsWithChildren) => children,
}));

import { clientPortalStandingContext } from "~/bounded-contexts/clients/public/request-context";
import {
  waitlistContext,
  type WaitlistFeature,
} from "~/bounded-contexts/sales/public/request-context";
import type { StoreProduct } from "~/bounded-contexts/sales/store/public/store";
import { STORE_CURRENCY_COOKIE_NAME } from "~/bounded-contexts/sales/store/public/store-currency";
import CatalogRoute from "~/bounded-contexts/sales/store/ui/public/catalog/catalog-page";
import { runtimeConfigContext } from "~/composition-root/guards/runtime-config-context.server";
import {
  contextEntry,
  createRequestArgs,
} from "~/composition-root/test-support/request-args";

import PublicLayoutRoute, { loader } from "./layout";

describe("public layout server rendering", () => {
  it("renders the store's prices in euros when no currency was chosen", async () => {
    // arrange
    const request = new Request("https://eli.example/store");

    // act
    const html = await renderStorePage(request);

    // assert
    expect(html).toContain("€39.00");
    expect(html).not.toContain("$45.00");
  });

  it("renders the store's prices in dollars in the first HTML when the cookie chose them", async () => {
    // arrange
    const request = new Request("https://eli.example/store", {
      headers: { Cookie: `${STORE_CURRENCY_COOKIE_NAME}=USD` },
    });

    // act
    const html = await renderStorePage(request);

    // assert
    expect(html).toContain("$45.00");
    expect(html).not.toContain("€39.00");
  });
});

async function renderStorePage(request: Request): Promise<string> {
  const handler = createStaticHandler([
    {
      children: [
        {
          Component: CatalogRoute,
          loader: () => ({ products: [createPlan()] }),
          path: "store",
        },
      ],
      Component: PublicLayoutRoute,
      loader,
      path: "/",
    },
  ]);
  const context = await handler.query(request, {
    requestContext: createRequestArgs({
      contexts: [
        contextEntry(runtimeConfigContext, {
          appBasePath: "/",
          botDetection: { provider: "static", token: "static-store-token" },
        }),
        contextEntry(clientPortalStandingContext, null),
        contextEntry(waitlistContext, {
          waitlistController: {
            getWaitlist: vi.fn().mockResolvedValue({
              availability: "available",
              enabled: false,
              offer: null,
            }),
          },
        } as unknown as WaitlistFeature),
      ],
      request,
    }).context,
  });

  if (context instanceof Response) {
    throw new Error(`Expected route context, received ${context.status}.`);
  }

  const router = createStaticRouter(handler.dataRoutes, context);

  return renderToString(
    <StaticRouterProvider context={context} router={router} />,
  );
}

function createPlan(): StoreProduct {
  return {
    cardSummary: "A four-week plan to lean out at home.",
    cover: {
      alt: "30-Day Fat Loss Plan cover",
      url: "/api/store/covers/fat-loss-plan.webp",
    },
    creatorName: "Eli",
    detailDescription: "Day-by-day workouts.",
    goals: [{ displayOrder: 2, label: "Fat Loss", slug: "fat-loss" }],
    includedItems: ["4-week calendar"],
    price: { eurCents: 3900, usdCents: 4500 },
    slug: "fat-loss-plan",
    title: "30-Day Fat Loss Plan",
    types: [{ displayOrder: 1, label: "Workouts", slug: "workouts" }],
  };
}
