// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { configureAxe } from "vitest-axe";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import PrivacyRoute from "./privacy";
import PublicLayoutRoute from "~/surfaces/public-site/shell/layout";

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

function renderPrivacyRoute(waitlist: Waitlist) {
  const router = createMemoryRouter(
    [
      {
        children: [{ element: <PrivacyRoute />, path: "privacy" }],
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
    { initialEntries: ["/privacy"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("PrivacyRoute UI integration", () => {
  it("renders the policy in the public layout", async () => {
    // arrange
    const waitlist = { availability: "available", enabled: true, offer: activeOffer } as const;

    // act
    const { baseElement } = renderPrivacyRoute(waitlist);

    // assert
    expect(await screen.findAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getByRole("main", { name: /\S/ })).toBeInTheDocument();

    const footers = screen.getAllByRole("contentinfo");

    expect(footers).toHaveLength(1);
    expect(within(footers[0]).getByRole("navigation", { name: /\S/ })).toBeInTheDocument();
    expect(within(footers[0]).queryByRole("region")).not.toBeInTheDocument();
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("keeps the privacy policy visible when availability is unavailable", async () => {
    // arrange
    const waitlist = { availability: null, enabled: true, offer: activeOffer } as const;

    // act
    renderPrivacyRoute(waitlist);

    // assert
    expect(await screen.findAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
