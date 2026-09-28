// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ClientNameBlock } from "./client-name-block";

afterEach(() => {
  cleanup();
});

describe("ClientNameBlock", () => {
  it("shows the client's name beside a decorative medallion", () => {
    // arrange, act
    render(<ClientNameBlock displayName="Ana Popescu" size="md" />);

    // assert
    expect(screen.getByText("Ana Popescu")).toBeVisible();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("stays a block rather than a link until a profile page exists", () => {
    // arrange, act
    render(<ClientNameBlock displayName="Client" size="sm" />);

    // assert
    expect(screen.getByText("Client")).toBeVisible();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
