// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";

import { PlatformQueryProvider } from "~/query-client";

import type { MarketingOutletContext } from "./layout/layout";
import PricingRoute from "./pricing";
import { useWaitlistQuery, WAITLIST_API_URL } from "./waitlist/waitlist-query";

const STATIC_CONTEXT = {
  botDetectionConfig: {
    provider: "static",
    token: TURNSTILE_TEST_RESPONSE_TOKEN,
  },
  waitlist: {
    availability: "available",
    enabled: true,
    offer: {
      plan: "all-bundles",
      campaignSlug: "all-bundles-launch-1",
    },
  },
  waitlistAvailabilityPresentationState: "ready",
} satisfies MarketingOutletContext;

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function QueryBackedPricingOutlet(props: { context: MarketingOutletContext }) {
  const waitlistQuery = useWaitlistQuery({
    initialWaitlist: props.context.waitlist,
  });

  return <Outlet context={{ ...props.context, waitlist: waitlistQuery.data }} />;
}

function renderPricingRoute(
  context: MarketingOutletContext,
  options: { useDefaultWaitlistApi?: boolean } = {},
) {
  if (options.useDefaultWaitlistApi ?? true) {
    server.use(http.get(WAITLIST_API_URL, () => HttpResponse.json(context.waitlist)));
  }

  const router = createMemoryRouter(
    [
      {
        children: [
          {
            element: <PricingRoute />,
            path: "pricing",
          },
          {
            element: <div data-testid="route-transition" />,
            path: "route-transition",
          },
        ],
        element: <QueryBackedPricingOutlet context={context} />,
        path: "/",
      },
      {
        action: async ({ request }) => fetch(request),
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/pricing"] },
  );

  return {
    router,
    ...render(
      <PlatformQueryProvider>
        <RouterProvider router={router} />
      </PlatformQueryProvider>,
    ),
  };
}

function getPricingEmailInput() {
  return screen.getByRole("textbox", { name: /\S/ });
}

function getPricingSubmitButton() {
  const form = getPricingEmailInput().closest("form");

  if (!form) {
    throw new Error("Expected the pricing email input to belong to a form.");
  }

  return within(form).getByRole("button", { name: /\S/ });
}

function getBundlePriceAnnouncements() {
  return screen.getAllByRole("article").map((bundleCard) =>
    Array.from(bundleCard.querySelectorAll<HTMLElement>("[aria-label]")),
  );
}

describe("PricingRoute", () => {
  it("renders named bundle choices with waitlist signup controls", () => {
    // arrange
    // act
    renderPricingRoute(STATIC_CONTEXT);

    // assert
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(2);
    const bundleCards = screen.getAllByRole("article");

    expect(bundleCards).toHaveLength(3);
    for (const bundleCard of bundleCards) {
      expect(
        within(bundleCard).getByRole("heading", { level: 3, name: /\S/ }),
      ).toBeInTheDocument();
    }
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getPricingEmailInput()).toBeInTheDocument();
    expect(getPricingSubmitButton()).toBeDisabled();
    expect(
      screen
        .queryAllByRole("link", { name: /\S/ })
        .find((link) => link.getAttribute("href") === "/book"),
    ).toBeUndefined();
  });

  it.each(["available", "limited"] as const)(
    "selects reduced pricing when availability is %s",
    (availability) => {
      // arrange
      const context = {
        ...STATIC_CONTEXT,
        waitlist: {
          ...STATIC_CONTEXT.waitlist,
          availability,
        },
      } satisfies MarketingOutletContext;

      // act
      renderPricingRoute(context);

      // assert
      for (const announcements of getBundlePriceAnnouncements()) {
        expect(announcements.length).toBeGreaterThan(1);
        for (const announcement of announcements) {
          expect(announcement).toHaveAccessibleName(/\S/);
        }
      }
    },
  );

  it("keeps normal price presentation and a usable form when availability is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        ...STATIC_CONTEXT.waitlist,
        availability: null,
      },
      waitlistAvailabilityPresentationState: "unavailable",
    } satisfies MarketingOutletContext;

    renderPricingRoute(context);

    // act
    await user.type(getPricingEmailInput(), "eli@example.com");

    // assert
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getPricingSubmitButton()).toBeEnabled();
    for (const announcements of getBundlePriceAnnouncements()) {
      expect(announcements).toHaveLength(1);
      expect(announcements[0]).toHaveAccessibleName(/\S/);
    }
  });

  it("renders normal pricing with the assessment booking link", () => {
    // arrange
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        availability: "available",
        enabled: false,
        offer: STATIC_CONTEXT.waitlist.offer,
      },
    } satisfies MarketingOutletContext;

    // act
    renderPricingRoute(context);

    // assert
    expect(screen.getByRole("link", { name: /\S/ })).toHaveAttribute("href", "/book");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    // arrange
    const context = STATIC_CONTEXT;

    // act
    renderPricingRoute(context);

    // assert
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
  });

  it("keeps the closed form usable", async () => {
    // arrange
    const user = userEvent.setup();
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        availability: "closed",
        enabled: true,
        offer: STATIC_CONTEXT.waitlist.offer,
      },
    } satisfies MarketingOutletContext;

    // act
    renderPricingRoute(context);
    await user.type(getPricingEmailInput(), "eli@example.com");

    // assert
    expect(getPricingSubmitButton()).toBeEnabled();
    for (const announcements of getBundlePriceAnnouncements()) {
      expect(announcements).toHaveLength(1);
      expect(announcements[0]).toHaveAccessibleName(/\S/);
    }
  });

  it("submits through the waitlist API without an immediate GET and preserves cached availability across navigation", async () => {
    // arrange
    const user = userEvent.setup();
    let getRequestCount = 0;
    let submittedEmail: FormDataEntryValue | null = null;
    let submittedToken: FormDataEntryValue | null = null;
    server.use(
      http.get(WAITLIST_API_URL, () => {
        getRequestCount += 1;

        return HttpResponse.json({
          availability: "available",
          enabled: true,
          offer: STATIC_CONTEXT.waitlist.offer,
        });
      }),
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        submittedEmail = formData.get("email");
        submittedToken = formData.get("cf-turnstile-response");

        return HttpResponse.json(
          {
            success: true,
          },
          { status: 201 },
        );
      }),
    );

    const { router } = renderPricingRoute(STATIC_CONTEXT, { useDefaultWaitlistApi: false });

    await waitFor(() => {
      if (getRequestCount === 0) {
        throw new Error("Expected the initial waitlist query to run.");
      }
    });

    // act
    await user.type(getPricingEmailInput(), "eli@example.com");
    await waitFor(() => {
      const botDetectionResponse = screen.getByTestId(
        "bot-detection-response",
      ) as HTMLInputElement;

      if (botDetectionResponse.value !== TURNSTILE_TEST_RESPONSE_TOKEN) {
        throw new Error("Expected bot detection token to be ready.");
      }
    });
    await user.click(getPricingSubmitButton());

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
    await router.navigate("/route-transition");
    await screen.findByTestId("route-transition");
    expect(router.state.location.pathname).toBe("/route-transition");
    await router.navigate("/pricing");
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /\S/ })).toBeInTheDocument();
    });

    // assert
    expect(submittedEmail).toBe("eli@example.com");
    expect(submittedToken).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
    expect(getRequestCount).toBe(1);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(getPricingSubmitButton()).toBeDisabled();
  });
});
