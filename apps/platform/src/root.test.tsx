// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { configureAxe } from "vitest-axe";

import { ErrorBoundary, meta } from "./root";

const axe = configureAxe({
  rules: {
    "color-contrast": { enabled: false },
  },
});

// `isRouteErrorResponse` duck-types rather than checking a class, so a plain
// object stands in for the thrown response React Router builds internally.
function routeErrorResponse(status: number, statusText: string) {
  return { data: null, internal: true, status, statusText };
}

function renderRouteWithRootErrorBoundary(options: {
  initialEntry: string;
  loader?: () => never;
}) {
  const router = createMemoryRouter(
    [
      {
        children: [
          { element: <p>Home</p>, index: true, loader: options.loader },
        ],
        ErrorBoundary,
        path: "/",
      },
    ],
    { initialEntries: [options.initialEntry] },
  );

  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
});

describe("root ErrorBoundary", () => {
  it("tells a visitor on an unknown URL that the page is missing and links home", async () => {
    // arrange
    const unknownUrl = "/no-such-page";

    // act
    const { baseElement } = renderRouteWithRootErrorBoundary({
      initialEntry: unknownUrl,
    });

    // assert
    expect(
      screen.getByRole("heading", { level: 1, name: "Page not found" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Error 404")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("main", { name: /\S/ })).toBeInTheDocument();
    expect((await axe(baseElement)).violations).toEqual([]);
  });

  it("keeps a server failure distinct from a missing page", async () => {
    // arrange
    const failingLoader = () => {
      throw new Response("Service Unavailable", { status: 503 });
    };

    // act
    renderRouteWithRootErrorBoundary({
      initialEntry: "/",
      loader: failingLoader,
    });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Something went wrong",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Error 503")).toBeInTheDocument();
    expect(screen.queryByText("Page not found")).not.toBeInTheDocument();
  });

  it("still offers a way back when the failure is not a response at all", async () => {
    // arrange
    const failingLoader = () => {
      throw new Error("Kaboom");
    };

    // act
    renderRouteWithRootErrorBoundary({
      initialEntry: "/",
      loader: failingLoader,
    });

    // assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Something went wrong",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Unexpected error")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to home/i })).toBeInTheDocument();
  });
});

describe("root meta", () => {
  it("titles a missing page as such rather than leaving the app's default title", () => {
    // arrange
    const notFound = routeErrorResponse(404, "Not Found");

    // act
    const descriptors = meta({ error: notFound } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({
      title: "Page Not Found | Eli Coach Platform",
    });
  });

  it("titles a server failure without claiming the page is missing", () => {
    // arrange
    const serverError = routeErrorResponse(500, "Internal Server Error");

    // act
    const descriptors = meta({ error: serverError } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({
      title: "Something Went Wrong | Eli Coach Platform",
    });
  });

  it("keeps the app title when nothing has failed", () => {
    // arrange
    const noError = undefined;

    // act
    const descriptors = meta({ error: noError } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({ title: "Eli Coach Platform" });
  });
});
