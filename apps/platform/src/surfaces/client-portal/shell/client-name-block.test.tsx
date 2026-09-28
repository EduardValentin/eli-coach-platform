// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClientNameBlock } from "./client-name-block";

afterEach(() => {
  cleanup();
});

describe("ClientNameBlock", () => {
  it("shows the client's name beside her avatar medallion", () => {
    // arrange, act
    const { container } = render(
      <ClientNameBlock displayName="Ana Popescu" size="md" />,
    );

    // assert
    expect(screen.getByText("Ana Popescu")).toHaveAttribute(
      "data-parity",
      "name",
    );
    expect(
      container.querySelector('[data-parity="avatar"] svg'),
    ).toHaveAttribute("aria-hidden", "true");
  });

  it("stays a block rather than a link until a profile page exists", () => {
    // arrange, act
    render(<ClientNameBlock displayName="Client" size="sm" />);

    // assert
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Client").closest("a")).toBeNull();
  });
});
