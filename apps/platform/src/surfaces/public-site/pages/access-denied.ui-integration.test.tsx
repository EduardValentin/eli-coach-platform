// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { SESSION_API_URL } from "~/features/accounts/ui/public/query";
import { PlatformQueryProvider } from "~/query-client";

import AccessDeniedRoute from "./access-denied";

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

function renderAccessDenied() {
  const router = createMemoryRouter(
    [{ element: <AccessDeniedRoute />, path: "*" }],
    { initialEntries: ["/403"] },
  );

  render(
    <PlatformQueryProvider>
      <RouterProvider router={router} />
    </PlatformQueryProvider>,
  );
}

describe("AccessDenied", () => {
  it("states the refusal once, whoever is asking", async () => {
    // arrange
    server.use(
      http.get(SESSION_API_URL, () => HttpResponse.json({ status: "anonymous" })),
    );

    // act
    renderAccessDenied();

    // assert
    const headings = await screen.findAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("You don’t have access to this page");
  });

  it("does not assume an account when nobody is signed in", async () => {
    // arrange
    server.use(
      http.get(SESSION_API_URL, () => HttpResponse.json({ status: "anonymous" })),
    );

    // act
    renderAccessDenied();

    // assert
    expect(await screen.findByText(/you're not signed in/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to the store/i }),
    ).toHaveAttribute("href", "/store");
  });

  it.each([
    ["CLIENT", /back to your portal/i, "/client"],
    ["COACH", /back to the coach portal/i, "/coach"],
    ["USER", /back to the store/i, "/store"],
  ])("points a %s at the place she can reach", async (role, label, href) => {
    // arrange
    server.use(
      http.get(SESSION_API_URL, () =>
        HttpResponse.json({ status: "authenticated", role }),
      ),
    );

    // act
    renderAccessDenied();

    // assert
    expect(await screen.findByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  });
});
