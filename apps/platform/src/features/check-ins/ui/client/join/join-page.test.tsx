// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import ClientCheckInJoinRoute, { meta } from "./join-page";

afterEach(() => {
  cleanup();
});

describe("the client's check-in join page", () => {
  it("tells her the link is not ready yet and leads her back to her check-ins", () => {
    // arrange, act
    render(
      <MemoryRouter>
        <ClientCheckInJoinRoute />
      </MemoryRouter>,
    );

    // assert
    const main = screen.getByRole("main", { name: "Your check-in" });
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Your check-in link isn't ready yet",
      }),
    ).toBeInTheDocument();
    expect(main).toHaveTextContent(
      "The meeting room for this check-in hasn't been set up yet. Check back closer to the time.",
    );
    const back = screen.getByRole("link", { name: "Back to check-ins" });
    expect(back).toHaveAttribute("href", "/client/checkins");
    expect(back.firstElementChild).toHaveClass("lucide-arrow-left");
  });

  it("titles the page for the browser tab", () => {
    // arrange, act
    const descriptors = meta({} as Parameters<typeof meta>[0]);

    // assert
    expect(descriptors).toEqual([{ title: "Check-in link not ready | Evoa" }]);
  });
});
