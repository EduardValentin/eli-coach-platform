// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TagInput } from "./tag-input";

const VOCABULARY = ["Cycle", "Nutrition", "Tracking", "Training"];

const TAG_LENGTH_LIMIT = 30;

afterEach(() => {
  cleanup();
});

function TagField({
  initial = [],
  maxLength = TAG_LENGTH_LIMIT,
  vocabulary = VOCABULARY,
}: {
  initial?: string[];
  maxLength?: number;
  vocabulary?: string[];
}) {
  const [tags, setTags] = useState<string[]>(initial);

  return (
    <>
      <label htmlFor="tags">Tags</label>
      <TagInput
        id="tags"
        maxLength={maxLength}
        onChange={setTags}
        value={tags}
        vocabulary={vocabulary}
      />
    </>
  );
}

function tagsField() {
  return screen.getByRole("combobox", { name: "Tags" });
}

function chosenTags(): string[] {
  const list = screen.queryByRole("list", { name: "Chosen tags" });
  if (!list) return [];

  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

function suggestionNames(): string[] {
  return within(screen.getByRole("listbox", { name: "Tag suggestions" }))
    .getAllByRole("option")
    .map((option) => option.textContent ?? "");
}

describe("TagInput suggestions", () => {
  it("suggests existing tags that contain the typed text, ignoring case and chosen tags", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField initial={["Training"]} />);

    // act
    await user.type(tagsField(), "TR");

    // assert
    expect(suggestionNames()).toEqual(["Tracking", "Nutrition", "Create “TR”"]);
  });

  it("offers no new tag when the text already names one in other casing", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);

    // act
    await user.type(tagsField(), "nutrition");

    // assert
    expect(suggestionNames()).toEqual(["Nutrition"]);
  });

  it("matches tags the same way whatever the device language", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField vocabulary={["İzmir"]} />);

    // act
    await user.type(tagsField(), "İzmir".toLowerCase());

    // assert
    expect(suggestionNames()).toEqual(["İzmir"]);
  });

  it("reports whether its suggestions are showing", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);

    // act
    await user.type(tagsField(), "cy");

    // assert
    expect(tagsField()).toHaveAttribute("aria-expanded", "true");
    expect(tagsField()).toHaveAttribute(
      "aria-controls",
      screen.getByRole("listbox", { name: "Tag suggestions" }).id,
    );
  });

  it("closes its suggestions on Escape without the key reaching an enclosing handler", async () => {
    // arrange
    const user = userEvent.setup();
    const dialogKeyDown = vi.fn();
    document.addEventListener("keydown", dialogKeyDown);
    render(<TagField />);
    await user.type(tagsField(), "cy");
    dialogKeyDown.mockClear();

    // act
    await user.keyboard("{Escape}");
    document.removeEventListener("keydown", dialogKeyDown);

    // assert
    expect(tagsField()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(dialogKeyDown).not.toHaveBeenCalled();
  });
});

describe("TagInput choosing tags", () => {
  it("commits the existing tag with a comma when its name is typed in other casing", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);

    // act
    await user.type(tagsField(), "cycle,");

    // assert
    expect(chosenTags()).toEqual(["Cycle"]);
  });

  it("creates a new tag from the Create option", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);
    await user.type(tagsField(), "Mobility");

    // act
    await user.click(screen.getByRole("option", { name: "Create “Mobility”" }));

    // assert
    expect(chosenTags()).toEqual(["Mobility"]);
  });

  it("never holds the same tag twice", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField initial={["Training"]} />);

    // act
    await user.type(tagsField(), "training{Enter}");

    // assert
    expect(chosenTags()).toEqual(["Training"]);
  });

  it("picks the highlighted suggestion with the arrow keys and Enter", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);
    await user.type(tagsField(), "tr");

    // act
    await user.keyboard("{ArrowDown}{Enter}");

    // assert
    expect(chosenTags()).toEqual(["Training"]);
  });

  it("wraps the highlight from the first suggestion back to the last", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);
    await user.type(tagsField(), "tr");

    // act
    await user.keyboard("{ArrowUp}");

    // assert
    expect(tagsField()).toHaveAttribute(
      "aria-activedescendant",
      screen.getByRole("option", { name: "Create “tr”" }).id,
    );
  });

  it("stops a tag at its maximum length", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField />);

    // act
    await user.type(tagsField(), `${"a".repeat(TAG_LENGTH_LIMIT)}bcd{Enter}`);

    // assert
    expect(chosenTags()).toEqual(["a".repeat(TAG_LENGTH_LIMIT)]);
  });
});

describe("TagInput removing tags", () => {
  it("removes the last tag with Backspace on an empty field", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField initial={["Cycle", "Nutrition"]} />);
    await user.click(tagsField());

    // act
    await user.keyboard("{Backspace}");

    // assert
    expect(chosenTags()).toEqual(["Cycle"]);
  });

  it("removes a tag from its own labelled button", async () => {
    // arrange
    const user = userEvent.setup();
    render(<TagField initial={["Cycle", "Nutrition"]} />);

    // act
    await user.click(screen.getByRole("button", { name: "Remove Cycle" }));

    // assert
    expect(chosenTags()).toEqual(["Nutrition"]);
  });
});
