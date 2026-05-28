// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
    cap: 10,
    enabled: true,
    offer: {
      plan: "12-months",
      slug: "12-months-launch-1",
    },
    spotsRemaining: 10,
  },
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
            element: <div>Route transition</div>,
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

describe("PricingRoute", () => {
  it("renders the waitlist-aware pricing page", () => {
    renderPricingRoute(STATIC_CONTEXT);

    expect(screen.getByRole("heading", { level: 1, name: "Coaching Plans" })).toBeInTheDocument();
    expect(
      screen.getByText("Join the waitlist and lock in reduced pricing on the 12-month plan."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Coaching bundle options" })).toBeInTheDocument();
    expect(screen.getByText("Interested in the waitlist price?")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Book Assessment Call/i })).not.toBeInTheDocument();
  });

  it("renders normal pricing with the assessment booking link", () => {
    renderPricingRoute({
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: false,
        offer: STATIC_CONTEXT.waitlist.offer,
        spotsRemaining: 10,
      },
    });

    expect(
      screen.getByText(
        "Experience 1-on-1 premium coaching with personalized workout protocols, customized nutrition, and uninterrupted support.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ready to start?")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book Assessment Call/i })).toHaveAttribute(
      "href",
      "/book",
    );
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
  });

  it("uses the active offer plan in waitlist pricing copy", () => {
    renderPricingRoute({
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: true,
        offer: {
          plan: "6-months",
          slug: "6-months-launch-1",
        },
        spotsRemaining: 10,
      },
    });

    expect(
      screen.getByText("Join the waitlist and lock in reduced pricing on the 6-month plan."),
    ).toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    renderPricingRoute(STATIC_CONTEXT);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("switches the closing form to notify-me when waitlist spots are full", () => {
    renderPricingRoute({
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: true,
        offer: STATIC_CONTEXT.waitlist.offer,
        spotsRemaining: 0,
      },
    });

    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("submits through the waitlist API and keeps the CTA mode from the refetched waitlist", async () => {
    const user = userEvent.setup();
    let didRefetchAfterSubmit = false;
    let getRequestCount = 0;
    let submitted = false;
    server.use(
      http.get(WAITLIST_API_URL, () => {
        getRequestCount += 1;
        didRefetchAfterSubmit ||= submitted;

        return HttpResponse.json({
          cap: 10,
          enabled: true,
          offer: STATIC_CONTEXT.waitlist.offer,
          spotsRemaining: submitted ? 9 : 10,
        });
      }),
      http.post(WAITLIST_API_URL, async ({ request }) => {
        const formData = await request.formData();

        expect(formData.get("email")).toBe("eli@example.com");
        expect(formData.get("cf-turnstile-response")).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
        submitted = true;

        return HttpResponse.json(
          {
            offer: STATIC_CONTEXT.waitlist.offer,
            pricing: "reduced",
            spotsRemaining: 0,
            success: true,
          },
          { status: 201 },
        );
      }),
    );

    const { router } = renderPricingRoute(STATIC_CONTEXT, { useDefaultWaitlistApi: false });

    await waitFor(() => {
      expect(getRequestCount).toBeGreaterThan(0);
    });
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      expect(screen.getByTestId("bot-detection-response")).toHaveValue(
        TURNSTILE_TEST_RESPONSE_TOKEN,
      );
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    await waitFor(() => {
      expect(screen.getByText("You're in. Keep an eye on your inbox.")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(didRefetchAfterSubmit).toBe(true);
    });
    await router.navigate("/route-transition");
    await waitFor(() => {
      expect(screen.getByText("Route transition")).toBeInTheDocument();
    });
    await router.navigate("/pricing");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Join the list" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Notify me" })).not.toBeInTheDocument();
  });
});
