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
      plan: "all-bundles",
      campaignSlug: "all-bundles-launch-1",
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
    // arrange
    const context = STATIC_CONTEXT;

    // act
    renderPricingRoute(context);

    // assert
    expect(screen.getByRole("heading", { level: 1, name: "Coaching Plans" })).toBeInTheDocument();
    expect(
      screen.getByText("Join the waitlist and lock in reduced pricing on every coaching plan."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Coaching bundle options" })).toBeInTheDocument();
    expect(screen.getByText("Waitlist pricing — reserved for early signups")).toBeInTheDocument();
    expect(screen.getByText("Save 10%")).toBeInTheDocument();
    expect(screen.getByText("Save 14%")).toBeInTheDocument();
    expect(
      screen.getByText(
        "On the 3- and 6-month plans, you may cancel within the first 7 days if coaching is not the right fit. After that, the full plan commitment applies.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Interested in the waitlist price?")).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Book Assessment Call/i })).not.toBeInTheDocument();
  });

  it("renders normal pricing with the assessment booking link", () => {
    // arrange
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: false,
        offer: STATIC_CONTEXT.waitlist.offer,
        spotsRemaining: 10,
      },
    } satisfies MarketingOutletContext;

    // act
    renderPricingRoute(context);

    // assert
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

  it("keeps the pricing page copy tied to the all-bundle waitlist offer", () => {
    // arrange
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: true,
        offer: {
          plan: "all-bundles",
          campaignSlug: "all-bundles-launch-1",
        },
        spotsRemaining: 10,
      },
    } satisfies MarketingOutletContext;

    // act
    renderPricingRoute(context);

    // assert
    expect(
      screen.getByText("Join the waitlist and lock in reduced pricing on every coaching plan."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Original 1 month monthly price €159")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 3 months monthly price €149")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 6 months monthly price €139")).toBeInTheDocument();
  });

  it("renders exactly one h1", () => {
    // arrange
    const context = STATIC_CONTEXT;

    // act
    renderPricingRoute(context);

    // assert
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("switches the closing form to notify-me when waitlist spots are full", () => {
    // arrange
    const context = {
      ...STATIC_CONTEXT,
      waitlist: {
        cap: 10,
        enabled: true,
        offer: STATIC_CONTEXT.waitlist.offer,
        spotsRemaining: 0,
      },
    } satisfies MarketingOutletContext;

    // act
    renderPricingRoute(context);

    // assert
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("submits through the waitlist API and keeps the CTA mode from the refetched waitlist", async () => {
    // arrange
    const user = userEvent.setup();
    let didRefetchAfterSubmit = false;
    let getRequestCount = 0;
    let submitted = false;
    let submittedEmail: FormDataEntryValue | null = null;
    let submittedToken: FormDataEntryValue | null = null;
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

        submittedEmail = formData.get("email");
        submittedToken = formData.get("cf-turnstile-response");
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
      if (getRequestCount === 0) {
        throw new Error("Expected the initial waitlist query to run.");
      }
    });

    // act
    await user.type(screen.getByLabelText("Email address"), "eli@example.com");
    await waitFor(() => {
      const botDetectionResponse = screen.getByTestId(
        "bot-detection-response",
      ) as HTMLInputElement;

      if (botDetectionResponse.value !== TURNSTILE_TEST_RESPONSE_TOKEN) {
        throw new Error("Expected bot detection token to be ready.");
      }
    });
    await user.click(screen.getByRole("button", { name: "Join the list" }));

    const submissionConfirmation = await screen.findByText("You're in. Keep an eye on your inbox.");
    await waitFor(() => {
      if (!didRefetchAfterSubmit) {
        throw new Error("Expected waitlist query to refetch after submit.");
      }
    });
    await router.navigate("/route-transition");
    const routeTransition = await screen.findByText("Route transition");
    await router.navigate("/pricing");
    const joinListButton = await screen.findByRole("button", { name: "Join the list" });

    // assert
    expect(submittedEmail).toBe("eli@example.com");
    expect(submittedToken).toBe(TURNSTILE_TEST_RESPONSE_TOKEN);
    expect(didRefetchAfterSubmit).toBe(true);
    expect(submissionConfirmation).toHaveTextContent("You're in. Keep an eye on your inbox.");
    expect(routeTransition).toHaveTextContent("Route transition");
    expect(joinListButton).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Notify me" })).not.toBeInTheDocument();
  });
});
