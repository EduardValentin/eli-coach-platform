// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router";

import { PublicMarketingLayout } from "./public-marketing-layout";

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const waitlist = {
  availability: "available" as const,
  enabled: false,
  offer: activeOffer,
};

afterEach(() => {
  cleanup();
});

function createPublicLayoutRouter(options?: {
  initialEntries?: string[];
  initialIndex?: number;
}) {
  return createMemoryRouter(
    [
      {
        children: [
          {
            element: (
              <>
                <h1>First page</h1>
                <Link data-testid="push-navigation-link" to="/second">
                  Go to second page
                </Link>
                <Link data-testid="replace-navigation-link" replace to="/second">
                  Replace with second page
                </Link>
              </>
            ),
            path: "/first",
          },
          {
            element: (
              <>
                <h1>Second page</h1>
                <button data-testid="focus-target" type="button">
                  Keep focus here
                </button>
              </>
            ),
            path: "/second",
          },
        ],
        element: (
          <PublicMarketingLayout scrollBehavior="solid" waitlist={waitlist}>
            <Outlet />
          </PublicMarketingLayout>
        ),
      },
    ],
    {
      initialEntries: options?.initialEntries ?? ["/first"],
      initialIndex: options?.initialIndex,
    },
  );
}

describe("PublicMarketingLayout route focus", () => {
  it("focuses the main landmark after PUSH navigation", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter();

    render(<RouterProvider router={router} />);

    const navigationLink = screen.getByTestId("push-navigation-link");

    // act
    await user.click(navigationLink);

    // assert
    expect(router.state.location.pathname).toBe("/second");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("focuses the main landmark after REPLACE navigation", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter();

    render(<RouterProvider router={router} />);

    const navigationLink = screen.getByTestId("replace-navigation-link");

    // act
    await user.click(navigationLink);

    // assert
    expect(router.state.location.pathname).toBe("/second");
    expect(screen.getByRole("main")).toHaveFocus();
  });

  it("does not focus the main landmark on initial render", () => {
    // arrange
    const router = createPublicLayoutRouter({
      initialEntries: ["/second"],
    });

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(screen.getByRole("main")).not.toHaveFocus();
  });

  it("does not force focus to the main landmark on POP navigation", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createPublicLayoutRouter({
      initialEntries: ["/first", "/second"],
      initialIndex: 1,
    });

    render(<RouterProvider router={router} />);

    const main = screen.getByRole("main");
    const focusedControl = screen.getByTestId("focus-target");

    // act
    await user.click(focusedControl);
    await act(async () => {
      await router.navigate(-1);
    });

    // assert
    expect(router.state.location.pathname).toBe("/first");
    expect(main).not.toHaveFocus();
  });
});
