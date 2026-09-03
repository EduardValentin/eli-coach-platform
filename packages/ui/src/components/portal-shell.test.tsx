// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { configureAxe } from "vitest-axe";

import { MAIN_CONTENT_ID } from "../constants";
import { PortalShell } from "./portal-shell";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

afterEach(() => {
  cleanup();
});

const portalLinks = [
  { href: "/coach", label: "Dashboard", icon: <span aria-hidden="true" /> },
  { href: "/coach/clients", label: "Clients", icon: <span aria-hidden="true" /> },
] as const;

function renderShell(
  initialPath = "/coach",
  links: readonly (typeof portalLinks)[number][] = portalLinks,
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <PortalShell
        asideLabel="Coach portal sidebar"
        brand={<p>Evoa</p>}
        links={links}
        mobileNavigationLabel="Coach portal mobile navigation"
        navigationLabel="Coach portal navigation"
        topBarBrand={<p>Coach Portal</p>}
      >
        <div>Coach content</div>
      </PortalShell>
    </MemoryRouter>,
  );
}

function queryMobileNavigation() {
  return screen.queryByRole("navigation", {
    name: "Coach portal mobile navigation",
  });
}

async function openMobileMenu(user: ReturnType<typeof userEvent.setup>) {
  const toggle = screen.getByRole("button", { name: "Open menu" });
  toggle.focus();
  await user.keyboard("{Enter}");

  const menu = queryMobileNavigation();
  if (menu === null) {
    throw new Error("The mobile menu did not open");
  }

  return menu;
}

describe("PortalShell landmarks", () => {
  it("renders a labeled sidebar, labeled navigation, the main landmark, and a skip link", () => {
    // arrange, act
    renderShell();

    // assert
    expect(
      screen.getByRole("complementary", { name: "Coach portal sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Coach portal navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", MAIN_CONTENT_ID);
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", `#${MAIN_CONTENT_ID}`);
  });

  it("renders the brand blocks and the page content", () => {
    // arrange, act
    renderShell();

    // assert
    expect(screen.getByText("Evoa")).toBeInTheDocument();
    expect(screen.getByText("Coach Portal")).toBeInTheDocument();
    expect(screen.getByText("Coach content")).toBeInTheDocument();
  });
});

describe("PortalShell active link", () => {
  it("marks the link matching the current path as the current page", () => {
    // arrange, act
    renderShell("/coach");

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Clients" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("marks only the longest matching link on a nested path", () => {
    // arrange, act
    renderShell("/coach/clients/42");

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Clients" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("leaves an exact-match link unmarked on a path beneath it", () => {
    // arrange: the shape the coach portal is in today — the portal root is the
    // only link, and the page below it is one no link points at.
    const rootOnly = [{ ...portalLinks[0], match: "exact" as const }];

    // act
    renderShell("/coach/clients/onboard", rootOnly);

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("still marks an exact-match link on its own path", () => {
    // arrange
    const rootOnly = [{ ...portalLinks[0], match: "exact" as const }];

    // act
    renderShell("/coach", rootOnly);

    // assert
    const sidebar = screen.getByRole("complementary", {
      name: "Coach portal sidebar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
  });
});

describe("PortalShell mobile menu", () => {
  it("opens through the keyboard-operable toggle and moves focus into the menu", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toHaveAttribute("aria-expanded", "false");

    // act
    const menu = await openMobileMenu(user);

    // assert
    expect(
      screen.getByRole("button", { name: "Close menu" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      within(menu).getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(menu.contains(document.activeElement)).toBe(true);
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    await openMobileMenu(user);

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(queryMobileNavigation()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveFocus();
  });

  it("keeps Tab cycling between the open menu and the toggle", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    const menu = await openMobileMenu(user);
    const toggle = screen.getByRole("button", { name: "Close menu" });

    // act, assert — a full lap of Tab presses never leaves the reachable set
    for (let press = 0; press < 6; press += 1) {
      await user.tab();
      const active = document.activeElement;
      expect(menu.contains(active) || active === toggle).toBe(true);
    }
  });

  it("closes when a navigation link inside the menu is activated", async () => {
    // arrange
    const user = userEvent.setup();
    renderShell();
    const menu = await openMobileMenu(user);

    // act
    await user.click(within(menu).getByRole("link", { name: "Clients" }));

    // assert
    expect(queryMobileNavigation()).not.toBeInTheDocument();
  });
});

describe("PortalShell accessibility", () => {
  it("has no obvious axe violations with the menu closed", async () => {
    // arrange
    const { baseElement } = renderShell();

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });

  it("has no obvious axe violations with the menu open", async () => {
    // arrange
    const user = userEvent.setup();
    const { baseElement } = renderShell();
    await openMobileMenu(user);

    // act
    const results = await axe(baseElement);

    // assert
    expect(results.violations).toEqual([]);
  });
});
