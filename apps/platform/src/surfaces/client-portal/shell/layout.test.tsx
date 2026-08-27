// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { ErrorBoundary } from "./layout";

afterEach(() => {
  cleanup();
});

// Mirrors root.test.tsx's approach: attach the boundary under test to the
// route whose loader fails, with an outer route boundary standing in for
// root.tsx's — proving a non-403 error really leaves this boundary instead
// of silently being swallowed here.
function renderWithClientErrorBoundary(options: { loader: () => never }) {
  const router = createMemoryRouter([
    {
      ErrorBoundary: () => <p>Outer boundary</p>,
      children: [
        {
          ErrorBoundary,
          children: [{ index: true, loader: options.loader }],
          path: "client",
        },
      ],
      path: "/",
    },
  ], { initialEntries: ["/client"] });

  return render(<RouterProvider router={router} />);
}

describe("client portal ErrorBoundary", () => {
  it("shows the client's own access-denied copy for a wrong-portal 403", async () => {
    // arrange
    const failingLoader = () => {
      throw Response.json({ recovery: "coach-portal" }, { status: 403 });
    };

    // act
    renderWithClientErrorBoundary({ loader: failingLoader });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "You don't have access to this page",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the coach portal" }),
    ).toHaveAttribute("href", "/coach");
  });

  it("defaults to the anonymous recovery when a 403 arrives without recovery data", async () => {
    // arrange
    const failingLoader = () => {
      throw new Response(null, { status: 403 });
    };

    // act
    renderWithClientErrorBoundary({ loader: failingLoader });

    // assert
    expect(
      await screen.findByRole("link", { name: "Back to the Store" }),
    ).toHaveAttribute("href", "/store");
  });

  it("leaves any other error for an ancestor boundary instead of rendering access-denied copy", async () => {
    // arrange
    const failingLoader = () => {
      throw new Response("Service Unavailable", { status: 503 });
    };

    // act
    renderWithClientErrorBoundary({ loader: failingLoader });

    // assert
    expect(await screen.findByText("Outer boundary")).toBeInTheDocument();
    expect(
      screen.queryByText("You don't have access to this page"),
    ).not.toBeInTheDocument();
  });
});
