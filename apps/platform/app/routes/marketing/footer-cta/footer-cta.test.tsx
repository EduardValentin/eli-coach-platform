// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
            waitlistAvailabilityPresentationState={
              waitlist.availability === null ? "unavailable" : "ready"
            }
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

function getFooterEmailInput() {
  return screen.getByRole("textbox", { name: /\S/ });
}

function getFooterSubmitButton() {
  const form = getFooterEmailInput().closest("form");

  if (!form) {
    throw new Error("Expected the footer email input to belong to a form.");
  }

  return within(form).getByRole("button", { name: /\S/ });
}

describe("MarketingFooterCta", () => {
  it("renders an enabled waitlist state when availability is known", () => {
    // arrange
    // act
    renderFooterCta({ availability: "available", enabled: true });

    // assert
    expect(screen.getByRole("region", { name: /\S/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getFooterSubmitButton()).toBeDisabled();
  });

  it("keeps the footer form usable when availability is unavailable", async () => {
    // arrange
    const user = userEvent.setup();

    // act
    renderFooterCta({ availability: null, enabled: true });
    await user.type(getFooterEmailInput(), "eli@example.com");

    // assert
    expect(screen.getByRole("region", { name: /\S/ })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(getFooterSubmitButton()).toBeEnabled();
  });

  it("renders normal-mode footer navigation links", () => {
    // arrange
    // act
    renderFooterCta({ availability: "available", enabled: false });

    // assert
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(1);
    expect(
      screen.getAllByRole("link", { name: /\S/ }).map((link) => link.getAttribute("href")),
    ).toEqual(["/store", "/pricing"]);
  });

  it("uses h2 headings for every footer variant", () => {
    // arrange
    // act
    const { unmount } = renderFooterCta({ availability: "available", enabled: true });

    // assert
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();

    // act
    unmount();
    renderFooterCta({ availability: "available", enabled: false });

    // assert
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(1);
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
    expect(screen.getByRole("region", { name: /\S/ })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /\S/ })).toHaveAttribute("href", "/store");
  });
});
