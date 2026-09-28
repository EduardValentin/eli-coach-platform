// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { SignOutButton } from "@clerk/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderClientLayout(presentation: ClientShellPresentation = ANA) {
  const RoutesStub = createRoutesStub([
    {
      children: [{ Component: () => <p>Dashboard page</p>, index: true }],
      Component: ClientLayoutRoute,
      loader: () => presentation,
      path: "/client",
    },
  ]);

  return render(
    <MotionConfig reducedMotion="always">
      <RoutesStub initialEntries={["/client"]} />
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

  it("lists only the dashboard, marked as the page being read", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const navigation = await screen.findByRole("navigation", {
      name: "Client portal navigation",
    });
    const links = within(navigation).getAllByRole("link");

    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName("Dashboard");
    expect(links[0]).toHaveAttribute("href", "/client");
    expect(links[0]).toHaveAttribute("aria-current", "page");
    expect(
      within(
        screen.getByRole("navigation", { name: "Client portal tabs" }),
      ).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "page");
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

  it("keeps the name block non-navigating until a profile page exists", async () => {
    // arrange, act
    renderClientLayout();

    // assert
    const sidebar = await screen.findByRole("complementary", {
      name: "Client portal sidebar",
    });

    expect(within(sidebar).getByText("Ana Popescu")).toBeVisible();
    expect(
      within(sidebar).queryByRole("link", { name: "Ana Popescu" }),
    ).not.toBeInTheDocument();
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
    expect(
      within(sheet).queryByRole("navigation", { name: "Client portal more" }),
    ).not.toBeInTheDocument();
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
