// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { BotDetectionConfig } from "~/modules/bot-detection/bot-detection-contract";
import { PlatformQueryProvider } from "~/query-client";

import { FooterCtaShell, MarketingFooterCta } from "./footer-cta";

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

const activeOffer = {
  plan: "12-months",
  slug: "12-months-launch-1",
} as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderFooterCta(waitlist: {
  enabled: boolean;
  cap: number;
  spotsRemaining: number | null;
}) {
  const waitlistWithOffer = {
    ...waitlist,
    offer: activeOffer,
  };

  const router = createMemoryRouter(
    [
      {
        element: (
          <MarketingFooterCta
            botDetectionConfig={STATIC_BOT_DETECTION}
            waitlist={waitlistWithOffer}
          />
        ),
        path: "/",
      },
      {
        action: () => new Response(null, { status: 404, statusText: "Not Found" }),
        path: "/api/waitlist",
      },
      {
        element: <div>Store</div>,
        path: "/store",
      },
      {
        element: <div>Pricing</div>,
        path: "/pricing",
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

describe("MarketingFooterCta", () => {
  it("renders the available waitlist footer CTA", () => {
    renderFooterCta({ enabled: true, cap: 12, spotsRemaining: 3 });

    expect(
      screen.getByRole("heading", { level: 2, name: "Don't miss your spot" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Join the waiting list and you'll be first to know when the 12-month program opens — plus a launch discount reserved only for early signups.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
    expect(screen.getByText("3 of 12 spots remaining")).toBeInTheDocument();
  });

  it("renders the full waitlist footer CTA without the spot counter", () => {
    renderFooterCta({ enabled: true, cap: 12, spotsRemaining: 0 });

    expect(
      screen.getByRole("heading", { level: 2, name: "This round filled up fast." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Notify me" })).toBeDisabled();
    expect(screen.queryByText("0 of 12 spots remaining")).not.toBeInTheDocument();
    expect(
      screen.queryByText("All spots have been claimed", { exact: false }),
    ).not.toBeInTheDocument();
  });

  it("renders linked normal-mode footer CTAs", () => {
    renderFooterCta({ enabled: false, cap: 12, spotsRemaining: 3 });

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Not ready for 1-on-1 coaching?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "That's okay. Start feeling better today — free workout challenges, recipes, and e-books, no card needed.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get the free starter pack" })).toHaveAttribute(
      "href",
      "/store",
    );
    expect(screen.getByRole("link", { name: "See coaching plans" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  });

  it("uses h2 headings for every footer variant", () => {
    const { unmount } = renderFooterCta({ enabled: true, cap: 12, spotsRemaining: 3 });

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    unmount();
    renderFooterCta({ enabled: false, cap: 12, spotsRemaining: 3 });

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("keeps shell content reachable when reduced motion is requested", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        addEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        removeEventListener: vi.fn(),
      }),
    );

    render(
      <FooterCtaShell>
        <h2>Reachable footer content</h2>
        <a href="/store">Reachable starter pack</a>
      </FooterCtaShell>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Reachable footer content" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reachable starter pack" })).toHaveAttribute(
      "href",
      "/store",
    );
  });
});
