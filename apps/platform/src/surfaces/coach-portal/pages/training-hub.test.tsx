// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import TrainingHubRoute from "./training-hub";

afterEach(() => {
  cleanup();
});

function renderHub(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/coach/training",
        Component: TrainingHubRoute,
        children: [
          { path: "plans", Component: () => <p>plans panel</p> },
          {
            path: "exercises",
            Component: () => (
              <>
                <p>library panel</p>
                <Outlet />
              </>
            ),
            children: [{ path: "new", Component: () => <p>dialog</p> }],
          },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );

  return render(<RouterProvider router={router} />);
}

describe("TrainingHubRoute", () => {
  it("frames the hub with the prototype's heading and three section links", async () => {
    // arrange, act
    renderHub("/coach/training/plans");

    // assert
    expect(
      await screen.findByRole("heading", { level: 1, name: "Training & Programs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manage client plans, templates, and exercises"),
    ).toBeInTheDocument();
    const sections = screen.getByRole("navigation", { name: "Training sections" });
    expect(
      within(sections)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Client Plans", "Templates", "Exercise Library"]);
    expect(
      within(sections).getByRole("link", { name: "Client Plans" }),
    ).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("plans panel")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New Exercise" })).not.toBeInTheDocument();
  });

  it("offers New Exercise on the library, including while its dialog is open", async () => {
    // arrange, act
    renderHub("/coach/training/exercises/new");

    // assert
    expect(await screen.findByRole("link", { name: "New Exercise" })).toHaveAttribute(
      "href",
      "/coach/training/exercises/new",
    );
    expect(screen.getByRole("link", { name: "Exercise Library" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("dialog")).toBeInTheDocument();
  });
});
