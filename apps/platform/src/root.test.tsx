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

  it.each([
    [
      "store",
      "This part of Evoa is for coaching clients and their coach. Your account doesn't have access to it.",
      "Back to the Store",
      "/store",
    ],
    [
      "client-portal",
      "This is the coach's side of Evoa. Your plan, check-ins and messages are in your portal.",
      "Back to your portal",
      "/client",
    ],
    [
      "coach-portal",
      "This is the client portal. Your clients, plans and check-ins are in the coach portal.",
      "Back to the coach portal",
      "/coach",
    ],
  ] as const)(
    "answers a portal denial recovering to %s with that surface's copy and destination",
    async (recovery, description, actionLabel, destination) => {
      // arrange
      const deniedByAPortalGuard = () => {
        throw Response.json({ recovery }, { status: 403 });
      };

      // act
      renderRouteWithRootErrorBoundary({
        initialEntry: "/",
        loader: deniedByAPortalGuard,
      });

      // assert
      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "You don't have access to this page",
        }),
      ).toBeInTheDocument();
      expect(screen.getByText("Error 403")).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: actionLabel }),
      ).toHaveAttribute("href", destination);
    },
  );

  it("sends a denial that names no recovery surface back to the Store", async () => {
    // arrange
    const deniedWithoutRecoveryData = () => {
      throw new Response(null, { status: 403 });
    };

    // act
    renderRouteWithRootErrorBoundary({
      initialEntry: "/",
      loader: deniedWithoutRecoveryData,
    });

    // assert
    expect(
      await screen.findByRole("link", { name: "Back to the Store" }),
    ).toHaveAttribute("href", "/store");
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
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
      title: "Page Not Found | Evoa",
    });
  });

  it("titles a portal denial as such rather than as a generic failure", () => {
    // arrange
    const denied = routeErrorResponse(403, "Forbidden");

    // act
    const descriptors = meta({ error: denied } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({
      title: "Access denied | Evoa",
    });
  });

  it("titles a server failure without claiming the page is missing", () => {
    // arrange
    const serverError = routeErrorResponse(500, "Internal Server Error");

    // act
    const descriptors = meta({ error: serverError } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({
      title: "Something Went Wrong | Evoa",
    });
  });

  it("keeps the app title when nothing has failed", () => {
    // arrange
    const noError = undefined;

    // act
    const descriptors = meta({ error: noError } as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toContainEqual({ title: "Evoa" });
  });
});
