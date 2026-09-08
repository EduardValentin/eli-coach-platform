// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";
import { createMemoryRouter, RouterProvider } from "react-router";

import { WEBSITE_AND_STORE_TERMS_DOCUMENT } from "@eli-coach-platform/content";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import PublicLayoutRoute from "~/surfaces/public-site/shell/layout";
import { PlatformQueryProvider } from "~/query-client";
import TermsRoute from "./terms";

const terms = WEBSITE_AND_STORE_TERMS_DOCUMENT;
const formattedEffectiveDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "long",
  timeZone: "UTC",
}).format(new Date(`${terms.effectiveDate}T00:00:00Z`));

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

afterEach(() => {
  cleanup();
});

function renderTermsRoute(waitlist: Waitlist) {
  const router = createMemoryRouter(
    [
      {
        children: [{ element: <TermsRoute />, path: "terms" }],
        element: <PublicLayoutRoute />,
        loader: () => ({
          botDetection: { provider: "static", token: "XXXX.DUMMY.TOKEN.XXXX" },
          session: { kind: "anonymous" },
          storePath: "/store",
          waitlist,
        }),
        path: "/",
      },
    ],
    { initialEntries: ["/terms"] },
  );

  return render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

describe("TermsRoute UI integration", () => {
  it("renders Terms in the public layout", async () => {
    // arrange
    const waitlist = { availability: "available", enabled: true, offer: activeOffer } as const;

    // act
    const { baseElement } = renderTermsRoute(waitlist);

    // assert
    const article = await screen.findByRole("article");
    const main = screen.getByRole("main", { name: /\S/ });
    const [footer] = screen.getAllByRole("contentinfo");
    const legalNavigation = within(footer).getByRole("navigation", { name: "Legal" });

    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(
      within(article).getByRole("heading", { level: 1, name: "Terms & Conditions" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(within(article).getAllByRole("heading", { level: 2 })).toHaveLength(
      terms.sections.length,
    );
    expect(main).toBeInTheDocument();
    expect(within(article).getByText(`Version ${terms.version}`)).toBeInTheDocument();
    expect(within(article).getByText(formattedEffectiveDate)).toBeInTheDocument();
    expect(
      within(article).getAllByRole("link", { name: "support@evoa.com" }),
    ).not.toHaveLength(0);
    expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
    expect(within(footer).getAllByRole("navigation", { name: "Legal" })).toHaveLength(1);
    expect(
      within(legalNavigation).getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("keeps Terms visible when availability is unavailable", async () => {
    // arrange
    const waitlist = { availability: null, enabled: true, offer: activeOffer } as const;

    // act
    renderTermsRoute(waitlist);

    // assert
    const article = await screen.findByRole("article");

    expect(
      within(article).getByRole("heading", { level: 1, name: "Terms & Conditions" }),
    ).toBeInTheDocument();
    expect(within(article).getByText(`Version ${terms.version}`)).toBeInTheDocument();
    expect(
      within(article).getAllByRole("link", { name: "support@evoa.com" }),
    ).not.toHaveLength(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
