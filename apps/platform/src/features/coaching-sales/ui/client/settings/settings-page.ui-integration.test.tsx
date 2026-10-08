// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { Toaster } from "@eli-coach-platform/ui/toast";
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
import { createMemoryRouter, redirect, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { clientAction as cancelSubscription } from "~/features/coaching-sales/api/client/subscription-cancellation";
import type { ClientSettings } from "~/features/coaching-sales/public/client-subscription";
import {
  CLIENT_ENDED_PATH,
  CLIENT_SETTINGS_PATH,
  COACHING_SALES_API_PATHS,
} from "~/features/coaching-sales/public/paths";
import { frameworkModeAction } from "~/server/test-support/framework-mode-action";

import SettingsRoute from "./settings-page";

const CANCELLATION_URL = COACHING_SALES_API_PATHS.subscriptionCancellation;

const WAITING_REFUNDABLE: ClientSettings = {
  subscription: {
    bundleId: "3-months",
    months: 3,
    amountCents: 44_700,
    currency: "eur",
    paidAt: "2026-09-28T09:00:00.000Z",
    status: "not-started",
    cancelledAt: null,
    accessEndsAt: null,
    paymentProblem: false,
  },
  cancellation: {
    rule: "full-refund",
    withdrawalDeadline: "2026-10-12T09:00:00.000Z",
    paidThrough: "2026-12-28T09:00:00.000Z",
    refundCents: 44_700,
  },
  startNowUntil: "2026-10-12T09:00:00.000Z",
  card: { brand: "visa", lastFour: "4242", expiryMonth: 12, expiryYear: 2034 },
};

const NO_REFUND: ClientSettings = {
  ...WAITING_REFUNDABLE,
  cancellation: {
    rule: "no-refund",
    withdrawalDeadline: "2026-10-12T09:00:00.000Z",
    paidThrough: "2026-12-28T09:00:00.000Z",
  },
  startNowUntil: null,
};

const CANCELLED: ClientSettings = {
  subscription: {
    ...WAITING_REFUNDABLE.subscription,
    status: "cancelled",
    cancelledAt: "2026-10-14T09:00:00.000Z",
    accessEndsAt: "2026-12-28T09:00:00.000Z",
  },
  cancellation: null,
  startNowUntil: null,
  card: WAITING_REFUNDABLE.card,
};

const FULL_REFUND_FACTS =
  "Until 12 October you can cancel for a full refund. Your access ends right away.";
const NO_REFUND_FACTS =
  "You won't be charged again, there is no refund for the coaching already paid, and your access stays until 28 December.";
const PAYMENT_PROBLEM_LINE =
  "Your last payment didn't go through. Update your card to keep your coaching going.";
const CARD_DESCRIPTION = "Visa ending in 4242 Expires 12/34";
const CANCEL_UNAVAILABLE =
  "Your coaching couldn't be cancelled just now. Nothing has changed, so please try again.";

type Loaded = { settings: ClientSettings; ended: boolean };

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  readerIsIn("Europe/Bucharest");
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.restoreAllMocks();
});

afterAll(() => {
  server.close();
});

describe("the settings page", () => {
  it("heads the page with no subtitle and frames her subscription as its own section", async () => {
    // arrange, act
    await renderSettings({ settings: WAITING_REFUNDABLE });

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "Settings" })
        .nextElementSibling,
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Subscription" }),
    ).toBeInTheDocument();
  });

  it("names her plan with the day she paid while her program has not started", async () => {
    // arrange, act
    await renderSettings({ settings: WAITING_REFUNDABLE });

    // assert
    const section = screen.getByRole("region", { name: "Subscription" });
    expect(within(section).getByText("3 months of coaching")).toBeVisible();
    expect(
      within(section).getByText(
        "Paid 28 September · starts when your program is delivered.",
      ),
    ).toBeVisible();
  });

  it("offers the full refund until her withdrawal deadline and names the row for assistive technology", async () => {
    // arrange, act
    await renderSettings({ settings: WAITING_REFUNDABLE });

    // assert
    expect(screen.getByText(FULL_REFUND_FACTS)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel" }),
    ).toHaveAccessibleDescription(`Cancellation ${FULL_REFUND_FACTS}`);
  });

  it("says she keeps her access without a refund once the withdrawal right is gone", async () => {
    // arrange, act
    await renderSettings({ settings: NO_REFUND });

    // assert
    expect(screen.getByText(NO_REFUND_FACTS)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancel" }),
    ).toHaveAccessibleDescription(`Cancellation ${NO_REFUND_FACTS}`);
  });

  it("reads when she cancelled and until when her access stays, with nothing left to cancel or change", async () => {
    // arrange, act
    await renderSettings({ settings: CANCELLED });

    // assert
    expect(
      screen.getByText(
        "Paid 28 September · cancelled 14 October · access until 28 December.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Change" }),
    ).not.toBeInTheDocument();
  });

  it("reads until when an active plan runs and that it renews then", async () => {
    // arrange, act
    await renderSettings({
      settings: {
        ...NO_REFUND,
        subscription: {
          ...NO_REFUND.subscription,
          status: "active",
          accessEndsAt: "2026-12-28T09:00:00.000Z",
        },
      },
    });

    // assert
    expect(
      screen.getByText(
        "Active until 28 December · renews then unless you cancel first.",
      ),
    ).toBeVisible();
  });

  it("drops the subscription section once her coaching has ended", async () => {
    // arrange, act
    await renderSettings({
      settings: {
        ...CANCELLED,
        subscription: { ...CANCELLED.subscription, status: "ended" },
      },
      waitFor: () => screen.findByRole("heading", { name: "Settings" }),
    });

    // assert
    expect(
      screen.queryByRole("region", { name: "Subscription" }),
    ).not.toBeInTheDocument();
  });
});

describe("her payment method", () => {
  it("reads the card on file as the row's description and names Change with it", async () => {
    // arrange, act
    await renderSettings({ settings: WAITING_REFUNDABLE });

    // assert
    const row = paymentMethodRow();
    expect(within(row).getByText("Visa")).toBeVisible();
    expect(within(row).getByText("•••• 4242")).toBeVisible();
    expect(within(row).getByText("Expires 12/34")).toBeVisible();
    expect(
      within(row).getByRole("button", { name: "Change" }),
    ).toHaveAccessibleDescription(`Payment method ${CARD_DESCRIPTION}`);
  });

  it.each([
    ["mastercard", "Mastercard"],
    ["eftpos_au", "Card"],
  ])("names a %s card on file as %s", async (brand, label) => {
    // arrange
    const card = { brand, lastFour: "4444", expiryMonth: 3, expiryYear: 2031 };

    // act
    await renderSettings({ settings: { ...WAITING_REFUNDABLE, card } });

    // assert
    expect(
      within(paymentMethodRow()).getByRole("button", { name: "Change" }),
    ).toHaveAccessibleDescription(
      `Payment method ${label} ending in 4444 Expires 03/31`,
    );
  });

  it("says when no payment method is configured", async () => {
    // arrange, act
    await renderSettings({ settings: { ...WAITING_REFUNDABLE, card: null } });

    // assert
    const row = paymentMethodRow();
    expect(within(row).getByText("No payment method configured")).toBeVisible();
    expect(
      within(row).getByRole("button", { name: "Change" }),
    ).toHaveAccessibleDescription(
      "Payment method No payment method configured",
    );
  });

  it("keeps the payment problem under the card", async () => {
    // arrange, act
    await renderSettings({
      settings: {
        ...WAITING_REFUNDABLE,
        subscription: {
          ...WAITING_REFUNDABLE.subscription,
          paymentProblem: true,
        },
      },
    });

    // assert
    const row = paymentMethodRow();
    const card = within(row).getByText("Expires 12/34");
    const problem = within(row).getByRole("status");
    expect(
      card.compareDocumentPosition(problem) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("hands her to the payment provider through a native form post", async () => {
    // arrange, act
    await renderSettings({ settings: WAITING_REFUNDABLE });

    // assert
    const change = screen.getByRole("button", { name: "Change" });
    expect(change).toHaveAttribute("type", "submit");
    const form = change.closest("form");
    expect(form).toHaveAttribute("method", "post");
    expect(form).toHaveAttribute(
      "action",
      "/api/coaching-sales/payment-method-session",
    );
  });

  it("announces that her last payment failed beside the way to update her card", async () => {
    // arrange, act
    await renderSettings({
      settings: {
        ...WAITING_REFUNDABLE,
        subscription: {
          ...WAITING_REFUNDABLE.subscription,
          paymentProblem: true,
        },
      },
    });

    // assert
    expect(screen.getByRole("status")).toHaveTextContent(PAYMENT_PROBLEM_LINE);
    expect(
      screen.getByRole("button", { name: "Change" }),
    ).toHaveAccessibleDescription(
      `Payment method ${CARD_DESCRIPTION} ${PAYMENT_PROBLEM_LINE}`,
    );
  });

  it("tells her the payment details could not be opened when the provider sent her back", async () => {
    // arrange, act
    await renderSettings({
      entry: `${CLIENT_SETTINGS_PATH}?paymentMethod=unavailable`,
      settings: WAITING_REFUNDABLE,
    });

    // assert
    const problem =
      "Your payment details couldn't be opened just now. Please try again.";
    expect(screen.getByRole("alert")).toHaveTextContent(problem);
    expect(
      screen.getByRole("button", { name: "Change" }),
    ).toHaveAccessibleDescription(
      `Payment method ${CARD_DESCRIPTION} ${problem}`,
    );
  });
});

describe("cancelling within her withdrawal period", () => {
  it("asks before cancelling, with the full refund as title, body and confirm", async () => {
    // arrange
    const user = await renderSettings({ settings: WAITING_REFUNDABLE });

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    const dialog = screen.getByRole("dialog", {
      description: "You'll get a full refund and your access ends right away.",
      name: "Cancel and get a full refund",
    });
    expect(
      within(dialog).getByRole("button", {
        name: "Cancel and get a full refund",
      }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Keep my coaching" }),
    ).toBeVisible();
  });

  it("keeps her keyboard inside the dialog", async () => {
    // arrange
    const user = await renderSettings({ settings: WAITING_REFUNDABLE });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const dialog = screen.getByRole("dialog");

    // act
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();

    // assert
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });

  it.each([
    [
      "Escape",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.keyboard("{Escape}");
      },
    ],
    [
      "Keep my coaching",
      async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(
          screen.getByRole("button", { name: "Keep my coaching" }),
        );
      },
    ],
  ])(
    "closes on %s without cancelling and hands focus back to Cancel",
    async (_way, dismiss) => {
      // arrange
      const requests = recordCancellations(cancelledWith("full-refund"));
      const user = await renderSettings({ settings: WAITING_REFUNDABLE });
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // act
      await dismiss(user);

      // assert
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      expect(requests).toEqual([]);
    },
  );

  it("cancels and lands on the ended page once the portal closes behind her", async () => {
    // arrange
    const requests = recordCancellations(cancelledWith("full-refund"));
    const loaded: Loaded = { settings: WAITING_REFUNDABLE, ended: false };
    const user = await renderSettings(loaded);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    loaded.ended = true;

    // act
    await user.click(
      screen.getByRole("button", { name: "Cancel and get a full refund" }),
    );

    // assert
    expect(
      await screen.findByRole("heading", { name: "Ended page" }),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });

  it("holds the confirm button busy while the cancellation is on its way", async () => {
    // arrange
    let release: () => void = () => {};
    server.use(
      http.post(`*${CANCELLATION_URL}`, async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });

        return cancelledWith("no-refund");
      }),
    );
    const user = await renderSettings({ settings: NO_REFUND });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // act
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel subscription",
      }),
    );

    // assert
    expect(
      await screen.findByRole("button", { name: "Cancelling…" }),
    ).toBeDisabled();
    release();
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("cancelling once her withdrawal right is gone", () => {
  it("asks with the no-refund facts as body and Cancel subscription as title and confirm", async () => {
    // arrange
    const user = await renderSettings({ settings: NO_REFUND });

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    const dialog = screen.getByRole("dialog", {
      description: NO_REFUND_FACTS,
      name: "Cancel subscription",
    });
    expect(
      within(dialog).getByRole("button", { name: "Cancel subscription" }),
    ).toBeVisible();
  });

  it("confirms with a toast, moves her focus to the section and reads her access end", async () => {
    // arrange
    const requests = recordCancellations(cancelledWith("no-refund"));
    const loaded: Loaded = { settings: NO_REFUND, ended: false };
    const user = await renderSettings(loaded);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    loaded.settings = CANCELLED;

    // act
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Cancel subscription",
      }),
    );

    // assert
    expect(
      await screen.findByText(
        "Subscription cancelled. Your access stays until 28 December.",
      ),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: "Subscription" }),
      ).toHaveFocus();
    });
    expect(
      await screen.findByText(
        "Paid 28 September · cancelled 14 October · access until 28 December.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
    expect(requests).toHaveLength(1);
  });
});

describe("a cancellation the platform refuses", () => {
  it.each([
    [503, { error: "provider-unavailable" }, CANCEL_UNAVAILABLE],
    [404, { error: "not-found" }, CANCEL_UNAVAILABLE],
    [
      409,
      {
        error: "nothing-to-cancel",
        message:
          "This coaching has already ended, so there is nothing to cancel.",
      },
      "This coaching has already ended, so there is nothing to cancel.",
    ],
  ])(
    "keeps the dialog open and says why (%i)",
    async (status, answer, message) => {
      // arrange
      recordCancellations(HttpResponse.json(answer, { status }));
      const user = await renderSettings({ settings: WAITING_REFUNDABLE });
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      // act
      await user.click(
        screen.getByRole("button", { name: "Cancel and get a full refund" }),
      );

      // assert
      const dialog = screen.getByRole("dialog");
      expect(await within(dialog).findByRole("alert")).toHaveTextContent(
        message,
      );
      expect(
        within(dialog).getByRole("button", {
          name: "Cancel and get a full refund",
        }),
      ).toBeEnabled();
    },
  );

  it("keeps the dialog open and asks her to try again when the request never reaches the server", async () => {
    // arrange
    server.use(http.post(`*${CANCELLATION_URL}`, () => HttpResponse.error()));
    const user = await renderSettings({ settings: WAITING_REFUNDABLE });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // act
    await user.click(
      screen.getByRole("button", { name: "Cancel and get a full refund" }),
    );

    // assert
    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      CANCEL_UNAVAILABLE,
    );
    expect(
      within(dialog).getByRole("button", {
        name: "Cancel and get a full refund",
      }),
    ).toBeEnabled();
  });

  it("clears the reason once she closes the dialog", async () => {
    // arrange
    recordCancellations(
      HttpResponse.json({ error: "provider-unavailable" }, { status: 503 }),
    );
    const user = await renderSettings({ settings: WAITING_REFUNDABLE });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(
      screen.getByRole("button", { name: "Cancel and get a full refund" }),
    );
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Keep my coaching" }));

    // act
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    // assert
    expect(
      within(screen.getByRole("dialog")).queryByRole("alert"),
    ).not.toBeInTheDocument();
  });
});

function paymentMethodRow(): HTMLElement {
  const row = within(screen.getByRole("region", { name: "Subscription" }))
    .getByText("Payment method")
    .closest("[data-parity='subscription-payment-method']");

  if (!(row instanceof HTMLElement)) {
    throw new Error("No payment method row");
  }

  return row;
}

function readerIsIn(timeZone: string) {
  const actual = new Intl.DateTimeFormat().resolvedOptions();

  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...actual,
    timeZone,
  });
}

function cancelledWith(rule: "full-refund" | "no-refund") {
  return HttpResponse.json({
    status: "cancelled",
    rule,
    accessEndsAt:
      rule === "no-refund"
        ? "2026-12-28T09:00:00.000Z"
        : "2026-10-03T09:00:00.000Z",
    refundDue: rule === "full-refund",
  });
}

function recordCancellations(response: Response): string[] {
  const requests: string[] = [];

  server.use(
    http.post(`*${CANCELLATION_URL}`, ({ request }) => {
      requests.push(request.method);

      return response.clone();
    }),
  );

  return requests;
}

async function renderSettings(options: {
  settings: ClientSettings;
  ended?: boolean;
  entry?: string;
  waitFor?: () => Promise<unknown>;
}) {
  const user = userEvent.setup();
  const loaded = options;
  const router = createMemoryRouter(
    [
      {
        Component: () => (
          <>
            <SettingsRoute />
            <Toaster />
          </>
        ),
        loader: () => {
          if (loaded.ended) {
            throw redirect(CLIENT_ENDED_PATH);
          }

          return loaded.settings;
        },
        path: CLIENT_SETTINGS_PATH,
      },
      {
        Component: () => <h1>Ended page</h1>,
        path: CLIENT_ENDED_PATH,
      },
      {
        action: frameworkModeAction(cancelSubscription),
        path: CANCELLATION_URL,
      },
    ],
    { initialEntries: [options.entry ?? CLIENT_SETTINGS_PATH] },
  );

  render(<RouterProvider router={router} />);
  await (options.waitFor?.() ??
    screen.findByRole("region", { name: "Subscription" }));

  return user;
}
