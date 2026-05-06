// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";

import type { MarketingOutletContext } from "./layout/layout";
import PricingRoute from "./pricing";

const STATIC_CONTEXT = {
  botDetectionConfig: {
    provider: "static",
    token: TURNSTILE_TEST_RESPONSE_TOKEN,
  },
  waitlist: {
    cap: 10,
    enabled: true,
    spotsRemaining: 10,
  },
} satisfies MarketingOutletContext;

afterEach(() => {
  cleanup();
});

function renderPricingRoute(
  context: MarketingOutletContext,
  action: () => Response | Promise<Response> = () =>
    Response.json({
      pricing: "reduced",
      spotsRemaining: 0,
      success: true,
    }),
) {
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            element: <PricingRoute />,
            path: "pricing",
          },
        ],
        element: <Outlet context={context} />,
        path: "/",
      },
      {
        action,
        path: "/api/waitlist",
      },
    ],
    { initialEntries: ["/pricing"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("PricingRoute", () => {
  it("renders the waitlist-aware pricing page", () => {
    renderPricingRoute(STATIC_CONTEXT);

    expect(screen.getByRole("heading", { level: 1, name: "Coaching Plans" })).toBeInTheDocument();
    expect(
      screen.getByText("Join the waitlist and lock in reduced pricing on the 12-month plan."),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Coaching bundle options" })).toBeInTheDocument();
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
        spotsRemaining: 0,
      },
    });

    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Join the list" })).not.toBeInTheDocument();
  });

  it("submits through the existing waitlist action from the pricing CTA", async () => {
    const user = userEvent.setup();

    renderPricingRoute(STATIC_CONTEXT);

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
  });
});
