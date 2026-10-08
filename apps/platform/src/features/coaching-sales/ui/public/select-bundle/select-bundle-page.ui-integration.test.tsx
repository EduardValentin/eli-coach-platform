// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { COACHING_BUNDLES } from "@eli-coach-platform/domain/coaching-bundle";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { BOOK_PATH } from "~/features/assessment-calls/public/paths";
import { presentBundleCards } from "~/features/coaching-sales/public/bundle-cards";
import type { BundlePage } from "~/features/coaching-sales/public/coaching-sales";
import { COACHING_SALES_API_PATHS } from "~/features/coaching-sales/public/paths";

import SelectBundleRoute from "./select-bundle-page";

const TOKEN = "tok_valid_payment_link_token";
const PAYMENT_LINK_STORAGE_KEY = "coaching-sales:payment-link";
const BUNDLE_PAGE_URL = COACHING_SALES_API_PATHS.bundlePage;
const CANCELLED_NOTICE =
  "No payment was taken. Pick a bundle whenever you're ready.";

const validPage: BundlePage = {
  state: "valid",
  tier: "reduced",
  cards: presentBundleCards(COACHING_BUNDLES, "reduced"),
  waitingStartsOn: "2026-10-10T10:00:00.000Z",
};

const callFirstPage: BundlePage = {
  state: "call-first",
  cards: presentBundleCards(COACHING_BUNDLES, "regular"),
};

const server = setupServer();

const nodesAddedOutsideReact: HTMLElement[] = [];

function appendSkipTarget() {
  const skipTarget = document.createElement("main");
  skipTarget.id = "main-content";
  document.body.append(skipTarget);
  nodesAddedOutsideReact.push(skipTarget);
}

let submissions: FormData[] = [];
let resolutions: unknown[] = [];

function captureSubmission(event: Event) {
  if (event.defaultPrevented) {
    return;
  }

  event.preventDefault();

  if (event.target instanceof HTMLFormElement) {
    submissions.push(new FormData(event.target));
  }
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  submissions = [];
  resolutions = [];
  document.addEventListener("submit", captureSubmission);
});

afterEach(() => {
  document.removeEventListener("submit", captureSubmission);
  cleanup();
  server.resetHandlers();
  window.sessionStorage.clear();
  window.history.replaceState(null, "", "/");
  while (nodesAddedOutsideReact.length > 0) {
    nodesAddedOutsideReact.pop()?.remove();
  }
});

afterAll(() => {
  server.close();
});

function answerBundlePage(page: BundlePage) {
  server.use(
    http.post(BUNDLE_PAGE_URL, async ({ request }) => {
      resolutions.push(await request.json());

      return HttpResponse.json(page);
    }),
  );
}

function renderSelectBundle(page: BundlePage, address: string) {
  answerBundlePage(page);

  return renderSelectBundleAt(address);
}

function renderSelectBundleAt(
  address: string,
  earlierAddresses: string[] = [],
) {
  window.history.replaceState(null, "", `/select-bundle${address}`);
  const entries = [...earlierAddresses, address].map(
    (entry) => `/select-bundle${entry}`,
  );
  const router = createMemoryRouter(
    [
      {
        Component: SelectBundleRoute,
        loader: () => null,
        path: "/select-bundle",
      },
      {
        action: ({ request }: { request: Request }) => fetch(request),
        path: BUNDLE_PAGE_URL,
      },
    ],
    { initialEntries: [`/select-bundle${address}`] },
  );
  render(<RouterProvider router={router} />);

  return router;
}

describe("SelectBundleRoute", () => {
  it("offers the reduced bundles with the popular one chosen and no start chosen", async () => {
    // arrange
    const address = `#${TOKEN}`;

    // act
    renderSelectBundle(validPage, address);

    // assert
    expect(
      await screen.findByText(
        "Based on our call, select the commitment timeframe that works best for you.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Choose Your Bundle" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
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
        name: "Start as soon as my payment is confirmed. I give up my 14-day right of withdrawal so Eli can start on my program now. If I cancel after that, there is no refund.",
      }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole("heading", { name: "A Call Comes First" }),
    ).not.toBeInTheDocument();
  });

  it("restores the link kept for this tab and the bundle and start the cancelled checkout carried back", async () => {
    // arrange
    window.sessionStorage.setItem(PAYMENT_LINK_STORAGE_KEY, TOKEN);
    const address = "?payment=cancelled&bundle=6-months&start=waiting";

    // act
    renderSelectBundle(validPage, address);

    // assert
    expect(
      await screen.findByRole("radio", { name: "6 Months" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", {
        name: /Start after the 14-day withdrawal period ends\./,
      }),
    ).toBeChecked();
    expect(screen.getByText(CANCELLED_NOTICE)).toBeInTheDocument();
    expect(resolutions).toEqual([{ token: TOKEN }]);
  });

  it("dismisses the cancelled notice and drops it from the address", async () => {
    // arrange
    const user = userEvent.setup();
    window.sessionStorage.setItem(PAYMENT_LINK_STORAGE_KEY, TOKEN);
    const router = renderSelectBundle(
      validPage,
      "?payment=cancelled&bundle=6-months",
    );

    // act
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));

    // assert
    expect(screen.queryByText(CANCELLED_NOTICE)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(router.state.location.search).toBe("?bundle=6-months");
    });
    expect(
      await screen.findByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
  });

  it("keeps focus on the page after the cancelled notice is dismissed", async () => {
    // arrange
    const user = userEvent.setup();
    window.sessionStorage.setItem(PAYMENT_LINK_STORAGE_KEY, TOKEN);
    renderSelectBundle(validPage, "?payment=cancelled");

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
    renderSelectBundle(validPage, `#${TOKEN}`);

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
    renderSelectBundle(validPage, `#${TOKEN}`);
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
    const address = "#unknown-token";

    // act
    renderSelectBundle(callFirstPage, address);

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
  it("tells her the link is being checked before the bundles appear", async () => {
    // arrange
    let answer = () => {};
    server.use(
      http.post(BUNDLE_PAGE_URL, async ({ request }) => {
        resolutions.push(await request.json());
        await new Promise<void>((resolve) => {
          answer = resolve;
        });

        return HttpResponse.json(validPage);
      }),
    );

    // act
    renderSelectBundleAt(`#${TOKEN}`);

    // assert
    const checking = await screen.findByRole("status");
    expect(checking).toHaveTextContent("Checking your link…");
    expect(checking).toHaveAttribute("aria-busy", "true");
    expect(
      screen.getByRole("heading", { level: 1, name: "Choose Your Bundle" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "A Call Comes First" }),
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(resolutions).toEqual([{ token: TOKEN }]);
    });
    answer();
    expect(
      await screen.findByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
  });

  it("reads the link from the fragment, takes it out of the address and keeps it for this tab", async () => {
    // arrange
    const address = `?payment=cancelled#${TOKEN}`;

    // act
    renderSelectBundle(validPage, address);

    // assert
    expect(
      await screen.findByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
    expect(resolutions).toEqual([{ token: TOKEN }]);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/select-bundle");
    expect(window.location.search).toBe("?payment=cancelled");
    expect(window.sessionStorage.getItem(PAYMENT_LINK_STORAGE_KEY)).toBe(TOKEN);
  });

  it("asks for a call first when she arrives without a link", async () => {
    // arrange
    const address = "";

    // act
    renderSelectBundle(callFirstPage, address);

    // assert
    expect(
      await screen.findByRole("heading", { name: "A Call Comes First" }),
    ).toBeInTheDocument();
    expect(resolutions).toEqual([{ token: "" }]);
    expect(
      screen.queryByRole("button", { name: "Continue to Checkout" }),
    ).not.toBeInTheDocument();
  });

  it("keeps her link when the fragment names an anchor on the page", async () => {
    // arrange
    appendSkipTarget();
    window.sessionStorage.setItem(PAYMENT_LINK_STORAGE_KEY, TOKEN);

    // act
    renderSelectBundle(validPage, "#main-content");

    // assert
    expect(
      await screen.findByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
    expect(resolutions).toEqual([{ token: TOKEN }]);
    expect(window.sessionStorage.getItem(PAYMENT_LINK_STORAGE_KEY)).toBe(TOKEN);
  });

  it("switches to a second link opened in the same tab", async () => {
    // arrange
    const secondToken = "tok_second_payment_link_token";
    const router = renderSelectBundle(validPage, `#${TOKEN}`);
    await screen.findByRole("button", { name: "Continue to Checkout" });

    // act
    await router.navigate(`/select-bundle#${secondToken}`);

    // assert
    await waitFor(() => {
      expect(resolutions).toEqual([{ token: TOKEN }, { token: secondToken }]);
    });
    expect(window.sessionStorage.getItem(PAYMENT_LINK_STORAGE_KEY)).toBe(
      secondToken,
    );
  });
});
