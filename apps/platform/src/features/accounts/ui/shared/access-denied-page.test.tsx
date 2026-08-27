// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { AccessDeniedPage, type AccessDeniedRecovery } from "./access-denied-page";

afterEach(() => {
  cleanup();
});

describe("AccessDeniedPage", () => {
  it.each([
    [
      "anonymous",
      "You're not signed in, so this page isn't available. Sign in from the Store to pick up where you left off.",
      "Back to the Store",
      "/store",
    ],
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
    "renders the %s recovery copy with a single heading and a keyboard-operable link",
    (recovery, description, actionLabel, to) => {
      // arrange & act
      renderAccessDeniedPage(recovery);

      // assert
      expect(
        screen.getByRole("heading", {
          level: 1,
          name: "You don't have access to this page",
        }),
      ).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.getByText("Error 403")).toBeInTheDocument();
      expect(screen.getByText(description)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: actionLabel });
      expect(link).toBeInTheDocument();
      expect(link.getAttribute("href")).toBe(to);
      expect(link.tabIndex).not.toBe(-1);
    },
  );
});

function renderAccessDeniedPage(recovery: AccessDeniedRecovery) {
  const router = createMemoryRouter([
    {
      element: <AccessDeniedPage recovery={recovery} />,
      path: "/",
    },
    { element: <div>Store</div>, path: "/store" },
    { element: <div>Client</div>, path: "/client" },
    { element: <div>Coach</div>, path: "/coach" },
  ]);

  render(<RouterProvider router={router} />);
}
