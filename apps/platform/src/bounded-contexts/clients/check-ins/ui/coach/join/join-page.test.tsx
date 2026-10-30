// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import CoachCheckInJoinRoute, { meta } from "./join-page";

afterEach(() => {
  cleanup();
});

describe("the coach's check-in join page", () => {
  it("tells her the meeting link is not set and leads her on to Settings", () => {
    // arrange, act
    render(
      <MemoryRouter>
        <CoachCheckInJoinRoute />
      </MemoryRouter>,
    );

    // assert
    const main = screen.getByRole("main", { name: "Your check-in" });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your meeting link isn't set yet",
      }),
    ).toBeInTheDocument();
    expect(main).toHaveTextContent(
      "You haven't saved a meeting link yet. Add it in Settings so you and your client can join.",
    );
    const forward = screen.getByRole("link", { name: "Go to Settings" });
    expect(forward).toHaveAttribute("href", "/coach/settings");
    expect(forward.lastElementChild).toHaveClass("lucide-arrow-right");
  });

  it("titles the page for the browser tab", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Meeting link not set | Evoa" }]);
  });
});
