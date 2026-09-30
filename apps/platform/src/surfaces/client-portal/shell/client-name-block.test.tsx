// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ClientNameBlock } from "./client-name-block";

afterEach(() => {
  cleanup();
});

describe("ClientNameBlock", () => {
  it("shows the client's name beside a decorative medallion", () => {
    // arrange, act
    render(<ClientNameBlock displayName="Ana Popescu" size="md" />, {
      wrapper: MemoryRouter,
    });

    // assert
    expect(screen.getByText("Ana Popescu")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("links to her profile under her name", () => {
    // arrange, act
    render(<ClientNameBlock displayName="Client" size="sm" />, {
      wrapper: MemoryRouter,
    });

    // assert
    expect(screen.getByRole("link", { name: "Client" })).toHaveAttribute(
      "href",
      "/client/profile",
    );
  });

  it("tells the surrounding navigation when she follows it", async () => {
    // arrange
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <ClientNameBlock
        displayName="Ana Popescu"
        onNavigate={onNavigate}
        size="md"
      />,
      { wrapper: MemoryRouter },
    );

    // act
    await user.click(screen.getByRole("link", { name: "Ana Popescu" }));

    // assert
    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
