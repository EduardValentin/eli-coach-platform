// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchField } from "./search-field";

afterEach(() => {
  cleanup();
});

describe("SearchField", () => {
  it("is a search box whose glyph leaves room for the text", () => {
    // arrange
    // act
    render(<SearchField aria-label="Search calls" />);

    // assert
    const field = screen.getByRole("searchbox", { name: "Search calls" });
    expect(field).toHaveClass("pl-9");
    expect(field.parentElement?.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("passes its size and value handling through to the input", async () => {
    // arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SearchField aria-label="Search calls" onChange={onChange} size="sm" />,
    );
    const field = screen.getByRole("searchbox", { name: "Search calls" });

    // act
    await user.type(field, "Ana");

    // assert
    expect(field).toHaveClass("h-(--size-control-sm)");
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
