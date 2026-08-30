// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { ErrorBoundary } from "./layout";

afterEach(() => {
  cleanup();
});

// The denial behavior itself belongs to the shared PortalAccessBoundary and
// is covered beside it; what this asserts is that the client portal's layout
// really is the route that answers a wrong-portal 403.
describe("client portal layout", () => {
  it("answers a wrong-portal 403 with the access-denied page", async () => {
    // arrange
    const router = createMemoryRouter(
      [
        {
          ErrorBoundary,
          children: [
            {
              index: true,
              loader: () => {
                throw Response.json(
                  { recovery: "coach-portal" },
                  { status: 403 },
                );
              },
            },
          ],
          path: "/client",
        },
      ],
      { initialEntries: ["/client"] },
    );

    // act
    render(<RouterProvider router={router} />);

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You don't have access to this page",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the coach portal" }),
    ).toHaveAttribute("href", "/coach");
  });
});
