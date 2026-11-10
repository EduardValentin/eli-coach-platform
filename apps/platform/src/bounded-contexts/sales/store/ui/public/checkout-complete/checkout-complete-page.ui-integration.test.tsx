// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { clientAction as resendOrderEmail } from "~/bounded-contexts/sales/store/adapters/inbound/http/orders/order-emails";
import { frameworkModeAction } from "~/composition-root/test-support/framework-mode-action";
import { STORE_API_PATHS } from "~/bounded-contexts/sales/store/public/paths";
import type { StoreOrderConfirmation } from "~/bounded-contexts/sales/store/public/store-orders";

import { STORE_CART_STORAGE_KEY } from "../cart/cart";
import { STORE_CHECKOUT_DETAILS_STORAGE_KEY } from "../cart/cart-storage";
import { StoreCartProvider } from "../cart/cart-provider";
import StoreCheckoutCompleteRoute from "./checkout-complete-page";

const SESSION_ID = "cs_test_order";

const confirmedOrder: StoreOrderConfirmation = {
  currency: "EUR",
  email: "woman@example.com",
  lines: [
    { amountMinorUnits: 3900, title: "30-Day Fat Loss Plan" },
    { amountMinorUnits: null, title: "Hormone Harmony" },
  ],
  sessionId: SESSION_ID,
  status: "confirmed",
  termsVersion: "2.0",
  totalMinorUnits: 3900,
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("StoreCheckoutCompleteRoute", () => {
  it("confirms the order with her email, every item and the total", async () => {
    // arrange
    const order = confirmedOrder;

    // act
    renderOrderPage(order);

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Order confirmed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your order email is on its way to/),
    ).toHaveTextContent(
      "Your order email is on its way to woman@example.com. Your download link is in that email and works for seven days.",
    );
    const summary = screen.getByRole("heading", {
      level: 2,
      name: "Your order",
    }).nextElementSibling as HTMLElement;
    expect(
      within(summary)
        .getAllByRole("term")
        .map((term) => term.textContent),
    ).toEqual(["30-Day Fat Loss Plan", "Hormone Harmony", "Total"]);
    expect(
      within(summary)
        .getAllByRole("definition")
        .map((value) => value.textContent),
    ).toEqual(["€39.00", "Free", "€39.00"]);
    expect(
      screen.getByText(
        "Stripe sends your payment receipt in a separate email.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the store" }),
    ).toHaveAttribute("href", "/store");
  });

  it("empties her cart and forgets her checkout details once the order is confirmed", async () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({ productSlugs: ["fat-loss-plan"], version: 1 }),
    );
    sessionStorage.setItem(
      STORE_CHECKOUT_DETAILS_STORAGE_KEY,
      JSON.stringify({
        deliveryConsent: true,
        email: "woman@example.com",
        marketingConsent: false,
        termsAccepted: true,
      }),
    );

    // act
    renderOrderPage(confirmedOrder);

    // assert
    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!).productSlugs,
      ).toEqual([]);
    });
    expect(
      sessionStorage.getItem(STORE_CHECKOUT_DETAILS_STORAGE_KEY),
    ).toBeNull();
  });

  it("tells her the payment was not completed and keeps her cart", async () => {
    // arrange
    localStorage.setItem(
      STORE_CART_STORAGE_KEY,
      JSON.stringify({ productSlugs: ["fat-loss-plan"], version: 1 }),
    );

    // act
    renderOrderPage({ status: "not_completed" });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Payment not completed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't confirm a payment for this checkout. Head back to the store to try again.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send my order email again" }),
    ).not.toBeInTheDocument();
    expect(
      JSON.parse(localStorage.getItem(STORE_CART_STORAGE_KEY)!).productSlugs,
    ).toEqual(["fat-loss-plan"]);
  });

  it.each([
    [
      "sent",
      HttpResponse.json({ outcome: "sent", success: true }),
      "Sent again to woman@example.com. Use the newest email: links in earlier ones no longer work.",
    ],
    [
      "processing",
      HttpResponse.json({ outcome: "processing", success: true }),
      "Your order is still being processed. Your email will arrive shortly.",
    ],
    [
      "rate limited",
      HttpResponse.json({ outcome: "rate_limited", success: true }),
      "You can't send it again just yet. Please try again later.",
    ],
    [
      "not found",
      HttpResponse.json({ outcome: "not_found", success: true }),
      "You can't send it again just yet. Please try again later.",
    ],
    [
      "unavailable",
      HttpResponse.json(
        {
          error: { code: "resend_unavailable", message: "Unavailable." },
          success: false,
        },
        { status: 503 },
      ),
      "You can't send it again just yet. Please try again later.",
    ],
  ])(
    "answers Send my order email again with the %s feedback",
    async (_outcome, answer, feedback) => {
      // arrange
      const user = userEvent.setup();
      const requestedSessions: string[] = [];
      server.use(
        http.post(STORE_API_PATHS.orderEmails, async ({ request }) => {
          requestedSessions.push(
            String((await request.formData()).get("sessionId")),
          );

          return answer.clone();
        }),
      );
      renderOrderPage(confirmedOrder);
      const resend = await screen.findByRole("button", {
        name: "Send my order email again",
      });

      // act
      await user.click(resend);

      // assert
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent(feedback);
      });
      expect(requestedSessions).toEqual([SESSION_ID]);
      expect(resend).toBeEnabled();
    },
  );

  it("keeps keyboard focus on Send my order email again while it sends, and sends once", async () => {
    // arrange
    const user = userEvent.setup();
    let releaseAnswer = () => {};
    const answerReleased = new Promise<void>((resolve) => {
      releaseAnswer = resolve;
    });
    const requestedSessions: string[] = [];
    server.use(
      http.post(STORE_API_PATHS.orderEmails, async ({ request }) => {
        requestedSessions.push(
          String((await request.formData()).get("sessionId")),
        );
        await answerReleased;

        return HttpResponse.json({ outcome: "sent", success: true });
      }),
    );
    renderOrderPage(confirmedOrder);
    const resend = await screen.findByRole("button", {
      name: "Send my order email again",
    });
    resend.focus();

    // act
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(resend).toHaveAttribute("aria-disabled", "true");
    });
    await user.keyboard("{Enter}");

    // assert
    expect(resend).toHaveFocus();
    releaseAnswer();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Sent again to woman@example.com.",
      );
    });
    expect(resend).toHaveFocus();
    expect(requestedSessions).toEqual([SESSION_ID]);
  });
});

function renderOrderPage(order: StoreOrderConfirmation) {
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <StoreCartProvider initialCurrency="EUR">
            <StoreCheckoutCompleteRoute />
          </StoreCartProvider>
        ),
        loader: () => order,
        path: "/store/checkout/complete",
      },
      {
        action: frameworkModeAction(resendOrderEmail),
        path: STORE_API_PATHS.orderEmails,
      },
    ],
    { initialEntries: [`/store/checkout/complete?session_id=${SESSION_ID}`] },
  );

  render(<RouterProvider router={router} />);
}
