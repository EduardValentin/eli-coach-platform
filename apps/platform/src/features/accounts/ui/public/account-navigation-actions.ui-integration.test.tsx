// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { PlatformQueryProvider } from "~/query-client";

import { AccountNavigationActions } from "./account-navigation-actions";
import { SESSION_API_URL } from "./query";

const clerk = vi.hoisted(() => ({
  auth: { isLoaded: true, isSignedIn: false },
  signOut: vi.fn(),
}));

vi.mock("@clerk/react", () => ({
  useAuth: () => clerk.auth,
  useClerk: () => ({ signOut: clerk.signOut }),
}));

const server = setupServer();

const signedIn = () => {
  clerk.auth = { isLoaded: true, isSignedIn: true };
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  clerk.auth = { isLoaded: true, isSignedIn: false };
});

afterAll(() => {
  server.close();
});

function renderNavigationActions(initialEntry = "/store") {
  const router = createMemoryRouter(
    [{ element: <AccountNavigationActions />, path: "*" }],
    { initialEntries: [initialEntry] },
  );

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

describe("AccountNavigationActions", () => {
  it("offers sign-in to a signed-out visitor, returning her to where she was", async () => {
    // arrange
    // act
    renderNavigationActions("/store");

    // assert
    const signIn = await screen.findByRole("link", { name: "Sign In" });
    expect(signIn).toHaveAttribute("href", "/auth/sign-in?redirect_url=%2Fstore");
  });

  it("offers only sign-out to a general user", async () => {
    // arrange
    signedIn();
    server.use(
      http.get(SESSION_API_URL, () =>
        HttpResponse.json({ status: "authenticated", role: "USER" }),
      ),
    );

    // act
    renderNavigationActions();

    // assert
    expect(await screen.findByRole("button", { name: "Sign Out" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
  });

  it.each([
    ["CLIENT", "Client Portal", "/client"],
    ["COACH", "Coach Portal", "/coach"],
  ])("gives a %s the matching portal entry", async (role, label, href) => {
    // arrange
    signedIn();
    server.use(
      http.get(SESSION_API_URL, () => HttpResponse.json({ status: "authenticated", role })),
    );

    // act
    renderNavigationActions();

    // assert
    expect(await screen.findByRole("link", { name: label })).toHaveAttribute("href", href);
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("shows no authentication control until the identity client has loaded", async () => {
    // arrange
    clerk.auth = { isLoaded: false, isSignedIn: false };

    // act
    renderNavigationActions();

    // assert
    expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign Out" })).not.toBeInTheDocument();
  });

  it("keeps a signed-in visitor signed in when the role lookup fails", async () => {
    // arrange
    signedIn();
    server.use(http.get(SESSION_API_URL, () => HttpResponse.error()));

    // act
    renderNavigationActions();

    // assert
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /portal/i })).not.toBeInTheDocument();
  });
});
