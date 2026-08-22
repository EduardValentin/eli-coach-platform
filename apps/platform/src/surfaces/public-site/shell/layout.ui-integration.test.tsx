// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { PlatformQueryProvider } from "~/query-client";
import { BOT_DETECTION_API_URL } from "@eli-coach-platform/infrastructure/bot-detection";
import HomeRoute from "~/surfaces/public-site/pages/home";
import TermsRoute from "~/surfaces/public-site/pages/terms";
import { SESSION_API_URL } from "~/features/accounts/ui/public/query";
import { WAITLIST_API_URL } from "~/features/waitlist/ui/public/query";

import PublicLayoutRoute from "./layout";

const server = setupServer();
const uiIntegrationWait = { timeout: 5_000 } as const;

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  server.use(
    http.get(BOT_DETECTION_API_URL, () =>
      HttpResponse.json({
        provider: "static",
        token: "XXXX.DUMMY.TOKEN.XXXX",
      }),
    ),
    http.get(SESSION_API_URL, () => HttpResponse.json({ status: "anonymous" })),
  );
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function renderPublicShell(initialEntry: "/" | "/terms") {
  const router = createMemoryRouter(
    [
      {
        children: [
          {
            index: true,
            element: <HomeRoute />,
          },
          {
            element: <TermsRoute />,
            path: "terms",
          },
        ],
        element: <PublicLayoutRoute />,
        loader: () => ({
          waitlist: {
            availability: null,
            enabled: true,
            offer: activeOffer,
          },
        }),
        path: "/",
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

function renderPublicHomeShell() {
  renderPublicShell("/");
}

function mockWaitlistApi(handler: (request: Request) => Response | Promise<Response>) {
  server.use(http.all(WAITLIST_API_URL, ({ request }) => handler(request)));
}

function getFooterCta() {
  return within(getPublicFooter()).getByRole("region", { name: /\S/ });
}

function getPublicFooter() {
  const publicFooters = screen.getAllByRole("contentinfo");

  expect(publicFooters).toHaveLength(1);

  return publicFooters[0];
}

function getWaitlistForms() {
  const forms = screen
    .queryAllByRole("textbox", { name: /\S/ })
    .map((textbox) => textbox.closest("form"))
    .filter(
      (form): form is HTMLFormElement =>
        form instanceof HTMLFormElement &&
        form.getAttribute("action") === "/api/waitlist",
    );

  return Array.from(new Set(forms));
}

function getFormEmailInput(form: HTMLFormElement) {
  return within(form).getByRole("textbox", { name: /\S/ }) as HTMLInputElement;
}

function getSubmitButton(form: HTMLFormElement) {
  return within(form).getByRole("button", { name: /\S/ }) as HTMLButtonElement;
}

function getLinksByHref(container: HTMLElement, href: string) {
  return within(container)
    .queryAllByRole("link", { name: /\S/ })
    .filter((link) => link.getAttribute("href") === href);
}

describe("public layout UI integration", () => {
  it("renders the Legal footer without the homepage CTA on a non-home public route", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderPublicShell("/terms");

    // assert
    expect(await screen.findByRole("article", {}, uiIntegrationWait)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);

    const publicFooter = getPublicFooter();
    const legalNavigation = within(publicFooter).getByRole("navigation", { name: /\S/ });

    expect(getLinksByHref(legalNavigation, "/privacy")).toHaveLength(1);
    expect(getLinksByHref(legalNavigation, "/terms")).toHaveLength(1);
    expect(within(publicFooter).queryByRole("region")).not.toBeInTheDocument();
  });

  it("hydrates the static shell with the live waitlist data", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderPublicHomeShell();

    // assert
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByRole("status")).toHaveLength(1);
    }, uiIntegrationWait);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2, name: /\S/ }).length).toBeGreaterThan(
      0,
    );
    const publicFooter = getPublicFooter();
    const footerCta = within(publicFooter).getByRole("region", { name: /\S/ });
    const legalNavigation = within(publicFooter).getByRole("navigation", { name: /\S/ });

    expect(footerCta).toContainElement(legalNavigation);
    expect(getWaitlistForms()).toHaveLength(2);
    expect(getLinksByHref(screen.getByRole("main", { name: /\S/ }), "/book")).toHaveLength(
      0,
    );
  });

  it("keeps public submissions disabled until runtime bot configuration loads", async () => {
    // arrange
    const user = userEvent.setup();
    let releaseBotDetectionConfig = () => {};
    const botDetectionConfigPending = new Promise<void>((resolve) => {
      releaseBotDetectionConfig = resolve;
    });
    server.use(
      http.get(BOT_DETECTION_API_URL, async () => {
        await botDetectionConfigPending;

        return HttpResponse.json({
          provider: "static",
          token: "runtime-static-token",
        });
      }),
    );
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );
    renderPublicHomeShell();
    await screen.findByRole("main", { name: /\S/ }, uiIntegrationWait);
    const form = getWaitlistForms()[0];

    if (!form) {
      throw new Error("Expected the static shell to contain a waitlist form.");
    }

    await user.type(getFormEmailInput(form), "visitor@example.com");

    // act
    const submitWasDisabledBeforeRuntimeConfig =
      getSubmitButton(form).disabled;
    releaseBotDetectionConfig();

    // assert
    expect(submitWasDisabledBeforeRuntimeConfig).toBe(true);
    await waitFor(() => {
      expect(getSubmitButton(form)).toBeEnabled();
    }, uiIntegrationWait);
  });

  it("shows closed availability and keeps both forms usable", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: true,
        offer: activeOffer,
      }),
    );

    // act
    renderPublicHomeShell();

    await screen.findByRole("contentinfo", {}, uiIntegrationWait);
    const footer = getFooterCta();
    await waitFor(() => {
      expect(screen.getAllByRole("status")).toHaveLength(1);
    }, uiIntegrationWait);
    for (const form of getWaitlistForms()) {
      await user.type(getFormEmailInput(form), "visitor@example.com");
    }

    // assert
    expect(getWaitlistForms().some((form) => footer.contains(form))).toBe(true);
    expect(getWaitlistForms().every((form) => !getSubmitButton(form).disabled)).toBe(true);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows normal footer CTA links when the live waitlist data disables waitlist mode", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: false,
        offer: activeOffer,
      }),
    );

    // act
    renderPublicHomeShell();

    await screen.findByRole("contentinfo", {}, uiIntegrationWait);
    const footer = getFooterCta();

    // assert
    await waitFor(() => {
      expect(getWaitlistForms().some((form) => footer.contains(form))).toBe(false);
    }, uiIntegrationWait);
    expect(getLinksByHref(footer, "/store")).toHaveLength(1);
    expect(getLinksByHref(footer, "/pricing")).toHaveLength(1);
  });

  it("submits the footer waitlist form without an immediate availability refetch", async () => {
    // arrange
    const user = userEvent.setup();
    const requests: string[] = [];
    let submittedEmail: FormDataEntryValue | null = null;

    mockWaitlistApi(async (request) => {
      if (request.method === "POST") {
        requests.push("POST");

        const formData = await request.formData();

        submittedEmail = formData.get("email");

        return HttpResponse.json({
          success: true,
        });
      }

      if (request.method === "GET") {
        requests.push("GET");

        return HttpResponse.json({
          availability: "limited",
          enabled: true,
          offer: activeOffer,
        });
      }

      return new HttpResponse(null, { status: 405 });
    });

    renderPublicHomeShell();

    await waitFor(() => {
      if (requests.length !== 1 || requests[0] !== "GET") {
        throw new Error("Expected the initial waitlist request to complete.");
      }

      expect(screen.getAllByRole("status")).toHaveLength(1);
    }, uiIntegrationWait);

    const footer = getFooterCta();

    // act
    const footerForm = footer.querySelector<HTMLFormElement>("form");

    if (!footerForm) {
      throw new Error("Expected the footer call to action to contain a waitlist form.");
    }

    await user.type(getFormEmailInput(footerForm), "footer@example.com");
    await user.click(getSubmitButton(footerForm));

    // assert
    await waitFor(() => {
      expect(requests).toEqual(["GET", "POST"]);
      expect(submittedEmail).toBe("footer@example.com");
      expect(getWaitlistForms().some((form) => footer.contains(form))).toBe(false);
      expect(screen.getAllByRole("status")).toHaveLength(1);
    }, uiIntegrationWait);
  });

  it("keeps forms usable when live data is unavailable", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() => new HttpResponse("Not found", { status: 404 }));

    // act
    renderPublicHomeShell();
    await screen.findByRole("main", { name: /\S/ }, uiIntegrationWait);
    const footer = getFooterCta();
    for (const form of getWaitlistForms()) {
      await user.type(getFormEmailInput(form), "visitor@example.com");
    }

    // assert
    await waitFor(() => {
      expect(screen.getAllByRole("alert")).toHaveLength(1);
    }, uiIntegrationWait);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getWaitlistForms().some((form) => footer.contains(form))).toBe(true);
    expect(getWaitlistForms().every((form) => !getSubmitButton(form).disabled)).toBe(true);
  });

  it("switches the static shell to normal mode when the live waitlist data disables waitlist mode", async () => {
    // arrange
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "closed",
        enabled: false,
        offer: activeOffer,
      }),
    );

    // act
    renderPublicHomeShell();
    const main = await screen.findByRole("main", { name: /\S/ }, uiIntegrationWait);

    // assert
    await waitFor(() => {
      expect(getWaitlistForms()).toHaveLength(0);
    }, uiIntegrationWait);
    expect(getLinksByHref(main, "/book").length).toBeGreaterThanOrEqual(2);
    expect(getLinksByHref(main, "/pricing").length).toBeGreaterThanOrEqual(1);
  });

  it("includes the platform capabilities section and swaps the phone view from the home shell", async () => {
    // arrange
    const user = userEvent.setup();
    mockWaitlistApi(() =>
      HttpResponse.json({
        availability: "available",
        enabled: true,
        offer: activeOffer,
      }),
    );

    renderPublicHomeShell();

    await waitFor(() => {
      expect(
        screen
          .getAllByRole("button", { name: /\S/ })
          .some((button) => button.getAttribute("aria-pressed") === "false"),
      ).toBe(true);
    }, uiIntegrationWait);
    const appCapabilitiesGroupCount = screen.getAllByRole("group", { name: /\S/ }).length;
    const capabilityButtons = screen
      .getAllByRole("button", { name: /\S/ })
      .filter((button) => button.hasAttribute("aria-pressed"));
    const previouslyPressedButton = capabilityButtons.find(
      (button) => button.getAttribute("aria-pressed") === "true",
    );
    const nextCapabilityButton = capabilityButtons.find(
      (button) => button.getAttribute("aria-pressed") === "false",
    );

    if (!previouslyPressedButton || !nextCapabilityButton) {
      throw new Error("Expected active and inactive platform capability controls.");
    }

    // act
    await user.click(nextCapabilityButton);

    // assert
    expect(appCapabilitiesGroupCount).toBeGreaterThanOrEqual(2);
    expect(previouslyPressedButton).toHaveAttribute("aria-pressed", "false");
    expect(nextCapabilityButton).toHaveAttribute("aria-pressed", "true");
  });
});
