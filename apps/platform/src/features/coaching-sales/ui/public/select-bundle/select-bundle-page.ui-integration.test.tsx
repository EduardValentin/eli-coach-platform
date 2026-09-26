// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { COACHING_BUNDLES } from "@eli-coach-platform/domain/coaching-bundle";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";
import { presentBundleCards } from "~/features/coaching-sales/contracts/bundle-cards";
import type { BundlePage } from "~/features/coaching-sales/contracts/coaching-sales";

import SelectBundleRoute from "./select-bundle-page";

const TOKEN = "tok_valid_payment_link_token";

const validPage: BundlePage = {
  state: "valid",
  tier: "reduced",
  cards: presentBundleCards(COACHING_BUNDLES, "reduced"),
  waitingStartsOn: "2026-10-10",
};

const callFirstPage: BundlePage = {
  state: "call-first",
  cards: presentBundleCards(COACHING_BUNDLES, "regular"),
};

let submissions: FormData[] = [];

function captureSubmission(event: Event) {
  if (event.defaultPrevented) {
    return;
  }

  event.preventDefault();

  if (event.target instanceof HTMLFormElement) {
    submissions.push(new FormData(event.target));
  }
}

beforeEach(() => {
  submissions = [];
  document.addEventListener("submit", captureSubmission);
});

afterEach(() => {
  document.removeEventListener("submit", captureSubmission);
  cleanup();
});

function renderSelectBundle(page: BundlePage, search: string) {
  const router = createMemoryRouter(
    [
      {
        Component: SelectBundleRoute,
        loader: () => page,
        path: "/select-bundle",
      },
    ],
    { initialEntries: [`/select-bundle${search}`] },
  );
  render(<RouterProvider router={router} />);

  return router;
}

describe("SelectBundleRoute", () => {
  it("offers the reduced bundles with the popular one chosen and no start chosen", async () => {
    // arrange
    const search = `?token=${TOKEN}`;

    // act
    renderSelectBundle(validPage, search);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Choose Your Bundle",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText(
        "Based on our call, select the commitment timeframe that works best for you.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Your reduced price — held for you"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Each bundle is a subscription: it renews at its own length — every 1, 3 or 6 months — and each renewal is charged up front.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "3 Months" })).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: /Start as soon as my payment is confirmed\./,
      }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole("heading", { name: "A Call Comes First" }),
    ).not.toBeInTheDocument();
  });

  it("restores the bundle and start the cancelled checkout carried back", async () => {
    // arrange
    const search = `?token=${TOKEN}&payment=cancelled&bundle=6-months&start=waiting`;

    // act
    renderSelectBundle(validPage, search);

    // assert
    expect(
      await screen.findByRole("radio", { name: "6 Months" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: /Start after the 14-day withdrawal period ends\./,
      }),
    ).toBeChecked();
    expect(
      screen.getByText(
        "No payment was taken. Pick a bundle whenever you're ready.",
      ),
    ).toBeInTheDocument();
  });

  it("dismisses the cancelled notice and drops it from the address", async () => {
    // arrange
    const user = userEvent.setup();
    const router = renderSelectBundle(
      validPage,
      `?token=${TOKEN}&payment=cancelled&bundle=6-months`,
    );

    // act
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));

    // assert
    expect(
      screen.queryByText(
        "No payment was taken. Pick a bundle whenever you're ready.",
      ),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe(
        `?token=${TOKEN}&bundle=6-months`,
      );
    });
  });

  it("keeps focus on the page after the cancelled notice is dismissed", async () => {
    // arrange
    const user = userEvent.setup();
    renderSelectBundle(validPage, `?token=${TOKEN}&payment=cancelled`);

    // act
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Choose Your Bundle" }),
    ).toHaveFocus();
  });

  it("keeps the checkout closed until a start is chosen and moves focus to the first start", async () => {
    // arrange
    const user = userEvent.setup();
    renderSelectBundle(validPage, `?token=${TOKEN}`);

    // act
    await user.click(
      await screen.findByRole("button", { name: "Continue to Checkout" }),
    );

    // assert
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose when you'd like your program to start.",
    );
    expect(
      screen.getByRole("radio", {
        name: /Start as soon as my payment is confirmed\./,
      }),
    ).toHaveFocus();
    expect(submissions).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
  });

  it("posts the link, bundle and start to checkout and shows it opening", async () => {
    // arrange
    const user = userEvent.setup();
    renderSelectBundle(validPage, `?token=${TOKEN}`);
    await user.click(await screen.findByRole("radio", { name: "1 Month" }));
    await user.click(
      screen.getByRole("radio", {
        name: /Start after the 14-day withdrawal period ends\./,
      }),
    );

    // act
    await user.click(
      screen.getByRole("button", { name: "Continue to Checkout" }),
    );

    // assert
    expect(submissions).toHaveLength(1);
    expect(Object.fromEntries(submissions[0])).toEqual({
      bundleId: "1-month",
      startChoice: "waiting",
      token: TOKEN,
    });
    expect(
      screen.getByRole("button", { name: "Opening checkout…" }),
    ).toBeDisabled();
  });

  it("shows the call-first state with the bundles out of reach", async () => {
    // arrange
    const search = "?token=unknown-token";

    // act
    renderSelectBundle(callFirstPage, search);

    // assert
    expect(
      await screen.findByRole("heading", { name: "A Call Comes First" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a Call" })).toHaveAttribute(
      "href",
      BOOK_PATH,
    );
    expect(
      screen.getByText(
        "These bundles are available for purchase exclusively after your call with Eli.",
      ),
    ).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    expect(
      screen.queryByRole("button", { name: "Continue to Checkout" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("When would you like your program to start?"),
    ).not.toBeInTheDocument();
  });
});
