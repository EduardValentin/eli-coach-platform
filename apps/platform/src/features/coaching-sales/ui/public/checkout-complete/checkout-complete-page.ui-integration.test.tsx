// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { BOOK_PATH } from "~/features/assessment-calls/contracts/paths";
import type { CheckoutConfirmation } from "~/features/coaching-sales/contracts/coaching-sales";

import CheckoutCompleteRoute from "./checkout-complete-page";

const paidConfirmation: CheckoutConfirmation = {
  state: "paid",
  amount: "€375",
  bundleTitle: "3 Months",
  email: "ana@example.com",
  renewalLabel: "Every 3 months",
  startChoice: "immediate",
  waitingStartsOn: "2026-10-10",
};

afterEach(() => {
  cleanup();
});

function renderConfirmation(confirmation: CheckoutConfirmation) {
  const router = createMemoryRouter(
    [
      {
        Component: CheckoutCompleteRoute,
        loader: () => confirmation,
        path: "/checkout/complete",
      },
    ],
    { initialEntries: ["/checkout/complete?session=cs_test_1"] },
  );
  render(<RouterProvider router={router} />);
}

function readings(): Record<string, string> {
  const list = screen.getAllByRole("term")[0]?.closest("dl");

  if (!list) {
    throw new Error("Expected the readings list.");
  }

  const terms = within(list).getAllByRole("term");
  const values = within(list).getAllByRole("definition");

  return Object.fromEntries(
    terms.map((term, index) => [term.textContent, values[index]?.textContent]),
  );
}

describe("CheckoutCompleteRoute", () => {
  it("confirms the payment with the readings for an immediate start", async () => {
    // arrange
    const confirmation = paidConfirmation;

    // act
    renderConfirmation(confirmation);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Payment confirmed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your invitation is on its way\. Eli sends it personally to/,
      ),
    ).toHaveTextContent(
      "Your invitation is on its way. Eli sends it personally to ana@example.com, and it works for 30 days once it arrives — you'll create your account from it.",
    );
    expect(readings()).toEqual({
      Bundle: "3 Months",
      Amount: "€375",
      Renews: "Every 3 months",
      "Your start": "Your program starts as soon as it's ready",
    });
    expect(
      screen.getByRole("link", { name: "Back to the home page" }),
    ).toHaveAttribute("href", "/");
  });

  it("dates the start after the withdrawal period for a waiting start", async () => {
    // arrange
    const confirmation: CheckoutConfirmation = {
      ...paidConfirmation,
      startChoice: "waiting",
    };

    // act
    renderConfirmation(confirmation);

    // assert
    await screen.findByRole("heading", { name: "Payment confirmed" });
    expect(readings()["Your start"]).toBe(
      "After your 14-day withdrawal period — Eli starts working on your program on 10 October 2026. You can let her start sooner from your account",
    );
  });

  it("falls back to the call-first state for a checkout that is not paid", async () => {
    // arrange
    const confirmation: CheckoutConfirmation = { state: "call-first" };

    // act
    renderConfirmation(confirmation);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "A Call Comes First",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a Call" })).toHaveAttribute(
      "href",
      BOOK_PATH,
    );
    expect(
      screen.queryByRole("heading", { name: "Payment confirmed" }),
    ).not.toBeInTheDocument();
  });
});
