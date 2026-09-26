// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import type { CallSalesState } from "~/features/coaching-sales/contracts/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/contracts/paths";

import { PaymentLinkAction } from "./payment-link-action";

const PAYMENT_LINKS_URL = COACHING_SALES_API_PATHS.paymentLinks;

const CALL = {
  fullName: "Ana Popescu",
  id: "4f1f3a3e-6b0a-4f45-9a3c-1c3b2f0a5d11",
  visitorEmail: "ana@example.com",
};

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("the payment link action on an ended call", () => {
  it("offers to send the link while the call is only held", async () => {
    // arrange, act
    await renderAction({ state: "held" });

    // assert
    expect(
      screen.getByRole("button", { name: "Send payment link" }),
    ).toBeInTheDocument();
  });

  it("offers to re-send the link once one is out", async () => {
    // arrange, act
    await renderAction({ state: "payment-link-sent" });

    // assert
    expect(
      screen.getByRole("button", { name: "Re-send payment link" }),
    ).toBeInTheDocument();
  });

  it("offers nothing once the call is paid", async () => {
    // arrange, act
    await renderAction({ state: "paid" });

    // assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("asks before sending and names who gets the email", async () => {
    // arrange
    const user = await renderAction({ state: "held" });

    // act
    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "Ana Popescu gets an email with a link to choose her bundle and pay.",
        name: "Send payment link?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send link" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("warns before a re-send that the earlier link stops working", async () => {
    // arrange
    const user = await renderAction({ state: "payment-link-sent" });

    // act
    await user.click(
      screen.getByRole("button", { name: "Re-send payment link" }),
    );

    // assert
    expect(
      screen.getByRole("dialog", {
        description:
          "A fresh link goes to ana@example.com. Her earlier link stops working.",
        name: "Re-send payment link?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Re-send link" }),
    ).toBeInTheDocument();
  });

  it("sends nothing when she cancels", async () => {
    // arrange
    const requests = recordSendRequests(sentTo("ana@example.com"));
    const user = await renderAction({ state: "held" });
    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests).toEqual([]);
  });

  it("sends the link for this call, confirms where it went and moves the row on", async () => {
    // arrange
    const requests = recordSendRequests(sentTo("ana@example.com"));
    const loaded = { state: "held" as CallSalesState };
    const user = await renderAction(loaded);
    await user.click(screen.getByRole("button", { name: "Send payment link" }));
    loaded.state = "payment-link-sent";

    // act
    await user.click(screen.getByRole("button", { name: "Send link" }));

    // assert
    expect(
      await screen.findByText("Payment link sent to ana@example.com."),
    ).toBeInTheDocument();
    expect(requests).toEqual([{ assessmentCallId: CALL.id }]);
    expect(
      await screen.findByRole("button", { name: "Re-send payment link" }),
    ).toBeInTheDocument();
  });

  it("says the email could not be sent when delivery fails", async () => {
    // arrange
    recordSendRequests(
      HttpResponse.json({ error: "delivery_failed" }, { status: 502 }),
    );
    const user = await renderAction({ state: "held" });
    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    // act
    await user.click(screen.getByRole("button", { name: "Send link" }));

    // assert
    expect(
      await screen.findByText(
        "The payment link was created, but the email could not be sent. Send it again in a moment.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send payment link" }),
    ).toBeEnabled();
  });

  it("holds the button busy while the link is on its way", async () => {
    // arrange
    let release: () => void = () => {};
    server.use(
      http.post(PAYMENT_LINKS_URL, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });

        return sentTo("ana@example.com");
      }),
    );
    const user = await renderAction({ state: "held" });
    await user.click(screen.getByRole("button", { name: "Send payment link" }));

    // act
    await user.click(screen.getByRole("button", { name: "Send link" }));

    // assert
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Send payment link" }),
      ).toHaveAttribute("aria-busy", "true");
    });
    expect(
      screen.getByRole("button", { name: "Send payment link" }),
    ).toBeDisabled();
    release();
    expect(
      await screen.findByText("Payment link sent to ana@example.com."),
    ).toBeInTheDocument();
  });
});

function sentTo(email: string) {
  return HttpResponse.json({ email, status: "sent" });
}

function recordSendRequests(response: Response): unknown[] {
  const requests: unknown[] = [];

  server.use(
    http.post(PAYMENT_LINKS_URL, async ({ request }) => {
      requests.push(await request.json());

      return response.clone();
    }),
  );

  return requests;
}

function ActionRoute() {
  const { state } = useLoaderData<{ state: CallSalesState }>();

  return (
    <>
      <PaymentLinkAction call={CALL} state={state} />
      <Toaster />
    </>
  );
}

async function renderAction(loaded: { state: CallSalesState }) {
  const user = userEvent.setup();
  const router = createMemoryRouter(
    [
      {
        Component: ActionRoute,
        loader: () => ({ state: loaded.state }),
        path: "/coach/assessment-calls",
      },
      {
        action: ({ request }: { request: Request }) => fetch(request),
        path: PAYMENT_LINKS_URL,
      },
    ],
    { initialEntries: ["/coach/assessment-calls"] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => {
    expect(router.state.initialized).toBe(true);
  });

  return user;
}
