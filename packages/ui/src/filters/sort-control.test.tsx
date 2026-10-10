// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { SortControl, type SortChoice, type SortOption } from "./sort-control";

type ResourceSortKey = "added" | "title";

const SORT_OPTIONS: readonly SortOption<ResourceSortKey>[] = [
  {
    defaultDirection: "desc",
    directionLabels: { asc: "Oldest first", desc: "Newest first" },
    key: "added",
    label: "Date added",
    order: "chronological",
  },
  {
    defaultDirection: "asc",
    directionLabels: { asc: "A to Z", desc: "Z to A" },
    key: "title",
    label: "Title",
    order: "alphabetical",
  },
];

beforeAll(() => {
  Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
  cleanup();
});

function SortedList() {
  const [sort, setSort] = useState<SortChoice<ResourceSortKey>>({
    direction: "desc",
    key: "added",
  });

  return (
    <>
      <SortControl onChange={setSort} options={SORT_OPTIONS} sort={sort} />
      <output>{`${sort.key} ${sort.direction}`}</output>
    </>
  );
}

describe("SortControl", () => {
  it("names the chosen key and its direction on the trigger", () => {
    // arrange, act
    render(<SortedList />);

    // assert
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Date added: newest first",
    );
  });

  it("answers a newly chosen key with that key's default direction", async () => {
    // arrange
    const user = userEvent.setup();
    render(<SortedList />);
    await user.click(screen.getByRole("button", { name: "Newest first" }));

    // act
    screen.getByRole("combobox", { name: "Sort by" }).focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("option", { name: "Title" }));

    // assert
    expect(screen.getByRole("status")).toHaveTextContent("title asc");
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Title: a to z",
    );
  });

  it("flips the direction from its toggle and marks it pressed off the default", async () => {
    // arrange
    const user = userEvent.setup();
    render(<SortedList />);
    const toggle = screen.getByRole("button", { name: "Newest first" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // act
    await user.click(toggle);

    // assert
    expect(screen.getByRole("status")).toHaveTextContent("added asc");
    expect(
      screen.getByRole("button", { name: "Oldest first" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
