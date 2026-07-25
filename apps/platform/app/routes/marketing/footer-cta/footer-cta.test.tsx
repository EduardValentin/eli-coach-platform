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
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderFooterCta(waitlist: {
  availability: "available" | "limited" | "closed" | null;
  enabled: boolean;
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
  it.each([
    ["available", "Reduced-price spots available"],
    ["limited", "Limited spots"],
    ["closed", "Reduced-price spots closed"],
  ] as const)(
    "renders only the %s qualitative availability claim",
    (availability, expectedClaim) => {
      // arrange
      // act
      renderFooterCta({ availability, enabled: true });

      // assert
      expect(screen.getByRole("status")).toHaveTextContent(expectedClaim);
      for (const claim of [
        "Reduced-price spots available",
        "Limited spots",
        "Reduced-price spots closed",
      ]) {
        expect(screen.queryAllByText(claim)).toHaveLength(claim === expectedClaim ? 1 : 0);
      }
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      expect(screen.queryByText(/of \d+ spots remaining/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", {
          name: availability === "closed" ? "Notify me" : "Join the list",
        }),
      ).toBeDisabled();
    },
  );

  it("renders neutral footer copy when availability is unavailable", () => {
    // arrange
    // act
    renderFooterCta({ availability: null, enabled: true });

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Join the waitlist" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Leave your email and you'll be first to know when coaching opens."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Limited spots")).not.toBeInTheDocument();
    expect(screen.queryByText(/reduced pricing/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join the list" })).toBeDisabled();
  });

  it("renders linked normal-mode footer CTAs", () => {
    // arrange
    // act
    renderFooterCta({ availability: "available", enabled: false });

    // assert
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
    // arrange
    // act
    const { unmount } = renderFooterCta({ availability: "available", enabled: true });

    // assert
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    // act
    unmount();
    renderFooterCta({ availability: "available", enabled: false });

    // assert
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("keeps shell content reachable when reduced motion is requested", () => {
    // arrange
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

    // act
    render(
      <FooterCtaShell>
        <h2>Reachable footer content</h2>
        <a href="/store">Reachable starter pack</a>
      </FooterCtaShell>,
    );

    // assert
    expect(
      screen.getByRole("heading", { level: 2, name: "Reachable footer content" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reachable starter pack" })).toHaveAttribute(
      "href",
      "/store",
    );
  });
});
