// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { SignOutButton } from "@clerk/react-router";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/react-router", () => ({
  SignOutButton: vi.fn(({ children }: PropsWithChildren) => children),
}));

import type { ClientShellPresentation } from "./client-identity-presentation";
import ClientLayoutRoute, { meta } from "./layout";

const ANA: ClientShellPresentation = {
  displayName: "Ana Popescu",
  greeting: "Welcome back, Ana.",
};

function ProfilePage() {
  return <h1>Her profile</h1>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderClientLayout(
  presentation: ClientShellPresentation = ANA,
  entry = "/client",
) {
  const RoutesStub = createRoutesStub([
    {
      children: [
        { Component: () => <p>Dashboard page</p>, index: true },
        { Component: ProfilePage, path: "profile" },
        { Component: () => <h1>Her settings</h1>, path: "settings" },
      ],
      Component: ClientLayoutRoute,
      loader: () => presentation,
      path: "/client",
    },
  ]);

  return render(
    <MotionConfig reducedMotion="always">
      <RoutesStub initialEntries={[entry]} />
    </MotionConfig>,
  );
}

describe("ClientLayoutRoute", () => {
  it("labels every landmark of the client shell", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    expect(
      await screen.findByRole("complementary", {
        name: "Client portal sidebar",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("banner", { name: "Client portal top bar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Client portal tabs" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Dashboard page");
  });

  it("lists the dashboard, her profile and her settings, marking the dashboard as the page being read", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Profile",
      "Settings",
    ]);
    expect(links[0]).toHaveAttribute("href", "/client");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(links[1]).toHaveAttribute("href", "/client/profile");
    expect(links[1]).not.toHaveAttribute("aria-current");
    expect(links[2]).toHaveAttribute("href", "/client/settings");
    expect(links[2]).not.toHaveAttribute("aria-current");
  });

  it("puts the dashboard and her profile in the tab bar and leaves her settings to the More sheet", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const tabs = await screen.findByRole("navigation", {
      name: "Client portal tabs",
    });

    expect(
      within(tabs).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
    expect(within(tabs).getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/client/profile",
    );
    expect(
      within(tabs).queryByRole("link", { name: "Settings" }),
    ).not.toBeInTheDocument();
  });

  it("marks her profile as the page being read on the profile page", async () => {
    // arrange, act
    renderClientLayout(ANA, "/client/profile");

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });

    expect(
      within(navigation).getByRole("link", { name: "Profile" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("names the client in the sidebar and the top bar", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });
    const topBar = screen.getByRole("banner", {
      name: "Client portal top bar",
    });

    expect(within(sidebar).getByText("Ana Popescu")).toBeInTheDocument();
    expect(within(topBar).getByText("Ana Popescu")).toBeInTheDocument();
  });

  it("names an account with no client record plainly as Client", async () => {
    // arrange, act
    renderClientLayout({ displayName: "Client", greeting: "Welcome back." });

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });

    expect(within(sidebar).getByText("Client")).toBeInTheDocument();
  });

  it("links her name to her profile in the sidebar and the top bar", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });
    const topBar = screen.getByRole("banner", {
      name: "Client portal top bar",
    });

    expect(
      within(sidebar).getByRole("link", { name: "Ana Popescu" }),
    ).toHaveAttribute("href", "/client/profile");
    expect(
      within(topBar).getByRole("link", { name: "Ana Popescu" }),
    ).toHaveAttribute("href", "/client/profile");
  });

  it("closes the More sheet when she follows her name to her profile", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout();
    await user.click(await screen.findByRole("button", { name: "More" }));
    const sheet = await screen.findByRole("dialog", { name: "More" });

    // act
    await user.click(within(sheet).getByRole("link", { name: "Ana Popescu" }));

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "More" }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole("heading", { name: "Her profile" }),
    ).toBeInTheDocument();
  });

  it("carries no notification bell and no way back to the public site", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    await screen.findByRole("complementary", { name: "Client portal sidebar" });
    expect(
      screen.queryByRole("button", { name: /notification/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Public Site" }),
    ).not.toBeInTheDocument();
  });

  it("marks her settings as the page being read on the settings page", async () => {
    // arrange, act
    renderClientLayout(ANA, "/client/settings");

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });

    expect(
      within(navigation).getByRole("link", { name: "Settings" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("closes the More sheet when she follows Settings from it", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout();
    await user.click(await screen.findByRole("button", { name: "More" }));
    const sheet = await screen.findByRole("dialog", { name: "More" });

    // act
    await user.click(
      within(
        within(sheet).getByRole("navigation", { name: "Client portal more" }),
      ).getByRole("link", { name: "Settings" }),
    );

    // assert
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "More" }),
      ).not.toBeInTheDocument();
    });
    expect(
      await screen.findByRole("heading", { name: "Her settings" }),
    ).toBeInTheDocument();
  });

  it("opens the More sheet with her name and a way to sign out to the public home", async () => {
    // arrange
    const user = userEvent.setup();
    renderClientLayout();

    // act
    await user.click(await screen.findByRole("button", { name: "More" }));

    // assert
    const sheet = await screen.findByRole("dialog", { name: "More" });

    expect(within(sheet).getByText("Ana Popescu")).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Sign out" }),
    ).toBeEnabled();
    expect(vi.mocked(SignOutButton)).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: "/" }),
      undefined,
    );
  });

  it("titles the installed client portal Evoa", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([
      { title: "Evoa" },
      {
        name: "description",
        content: "Your coaching home: your program, check-ins and progress.",
      },
      { name: "theme-color", content: "#ffffff" },
    ]);
  });
});
