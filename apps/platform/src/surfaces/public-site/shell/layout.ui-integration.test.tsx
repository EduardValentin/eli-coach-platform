// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { PropsWithChildren } from "react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

// The shell composes AuthNavActions, which renders Clerk's SignInButton /
// SignOutButton. Those clone their child and wire an onClick into a live
// Clerk instance (see @clerk/react-router), which this shell integration
// test has no reason to stand up — none of these scenarios exercise sign-in,
// so the mock renders the child directly instead.
vi.mock("@clerk/react-router", () => ({
  SignInButton: ({ children }: PropsWithChildren) => children,
  SignOutButton: ({ children }: PropsWithChildren) => children,
}));

import { TURNSTILE_TEST_RESPONSE_TOKEN } from "@eli-coach-platform/config";
import type { BotDetectionConfig } from "@eli-coach-platform/infrastructure/bot-detection";
import type { Waitlist } from "~/features/waitlist/contracts/waitlist";
import HomeRoute from "~/surfaces/public-site/pages/home";
import TermsRoute from "~/surfaces/public-site/pages/terms";
import {
  WAITLIST_API_PATH,
  WAITLIST_API_URL,
} from "~/features/waitlist/ui/public/api-client";

import PublicLayoutRoute, { shouldRevalidate } from "./layout";

const server = setupServer();
const uiIntegrationWait = { timeout: 5_000 } as const;
let shellLoadCount = 0;

const activeOffer = {
  plan: "all-bundles",
  campaignSlug: "all-bundles-launch-1",
} as const;

const STATIC_BOT_DETECTION = {
  provider: "static",
  token: TURNSTILE_TEST_RESPONSE_TOKEN,
} satisfies BotDetectionConfig;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  shellLoadCount = 0;
});

afterAll(() => {
  server.close();
});

function createWaitlist(overrides?: Partial<Waitlist>): Waitlist {
  return {
    availability: "available",
    enabled: true,
    offer: activeOffer,
    ...overrides,
  };
}

function renderPublicShell(initialEntry: "/" | "/terms", waitlist: Waitlist) {
  const router = createMemoryRouter(
    [
      {
        children: [
          { index: true, element: <HomeRoute /> },
          { element: <TermsRoute />, path: "terms" },
        ],
        element: <PublicLayoutRoute />,
        loader: () => {
          shellLoadCount += 1;

          return {
            botDetection: STATIC_BOT_DETECTION,
            session: { kind: "anonymous" },
            storePath: "/store",
            waitlist,
          };
        },
        path: "/",
        shouldRevalidate,
      },
      { action: async ({ request }) => fetch(request), path: WAITLIST_API_PATH },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />);
}

function renderPublicHomeShell(waitlist: Waitlist = createWaitlist()) {
  renderPublicShell("/", waitlist);
}

function mockWaitlistSubmit(handler: (request: Request) => Response | Promise<Response>) {
  server.use(http.post(WAITLIST_API_URL, ({ request }) => handler(request)));
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
    // act
    renderPublicShell("/terms", createWaitlist());

    // assert
    expect(await screen.findByRole("article", {}, uiIntegrationWait)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(1);

    const publicFooter = getPublicFooter();
    const legalNavigation = within(publicFooter).getByRole("navigation", { name: /\S/ });

    expect(getLinksByHref(legalNavigation, "/privacy")).toHaveLength(1);
    expect(getLinksByHref(legalNavigation, "/terms")).toHaveLength(1);
    expect(within(publicFooter).queryByRole("region")).not.toBeInTheDocument();
  });

  it("renders the live availability from the loader", async () => {
    // arrange
    // act
    renderPublicHomeShell();

    // assert
    expect(await screen.findByRole("status", {}, uiIntegrationWait)).toHaveTextContent(
      "Reduced-price spots available",
    );
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("shows closed availability and keeps both forms usable", async () => {
    // arrange
    const user = userEvent.setup();

    // act
    renderPublicHomeShell(createWaitlist({ availability: "closed" }));

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

  it("shows normal footer CTA links when the loader disables waitlist mode", async () => {
    // arrange
    // act
    renderPublicHomeShell(createWaitlist({ availability: "closed", enabled: false }));

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

    mockWaitlistSubmit(async (request) => {
      requests.push("POST");
      submittedEmail = (await request.formData()).get("email");

      return HttpResponse.json({ success: true });
    });

    renderPublicHomeShell(createWaitlist({ availability: "limited" }));

    await screen.findByRole("status", {}, uiIntegrationWait);

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
      expect(requests).toEqual(["POST"]);
      expect(submittedEmail).toBe("footer@example.com");
      expect(getWaitlistForms().some((form) => footer.contains(form))).toBe(false);
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(shellLoadCount).toBe(1);
    }, uiIntegrationWait);
  });

  it("keeps forms usable when live data is unavailable", async () => {
    // arrange
    const user = userEvent.setup();

    // act
    renderPublicHomeShell(createWaitlist({ availability: null }));
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

  it("renders normal mode from the loader", async () => {
    // arrange
    // act
    renderPublicHomeShell(createWaitlist({ enabled: false }));
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
