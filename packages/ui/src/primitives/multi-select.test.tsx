// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MultiSelect } from "./multi-select";

afterEach(() => {
  cleanup();
});

type Tag = "strength" | "recovery";

const TAG_LABELS: Record<Tag, string> = {
  strength: "Strength",
  recovery: "Recovery",
};

function renderTagFilter(selected: Tag[]) {
  const onToggle = vi.fn();
  render(
    <MultiSelect<Tag>
      label="Tags"
      labels={TAG_LABELS}
      onToggle={onToggle}
      options={["strength", "recovery"]}
      selected={selected}
    />,
  );
  return { user: userEvent.setup(), onToggle };
}

const MUSCLES = [
  "Chest",
  "Lats",
  "Traps",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Core",
  "Glutes",
  "Calves",
] as const;
type Muscle = (typeof MUSCLES)[number];
const MUSCLE_LABELS = Object.fromEntries(
  MUSCLES.map((muscle) => [muscle, muscle]),
) as Record<Muscle, string>;

function renderMuscles(options: readonly Muscle[]) {
  const onToggle = vi.fn();
  render(
    <MultiSelect<Muscle>
      label="Primary muscles"
      labels={MUSCLE_LABELS}
      onToggle={onToggle}
      options={options}
      selected={[]}
      summary="names"
    />,
  );
  return { user: userEvent.setup(), onToggle };
}

describe("MultiSelect", () => {
  it("is named for its label while nothing is chosen", () => {
    // arrange, act
    renderTagFilter([]);

    // assert
    expect(screen.getByRole("button", { name: "Tags" })).toHaveTextContent(
      /^Tags$/,
    );
  });

  it("names itself as required, with how many options are chosen", () => {
    // arrange, act
    render(
      <MultiSelect<Tag>
        label="Tags"
        labels={TAG_LABELS}
        onToggle={vi.fn()}
        options={["strength", "recovery"]}
        required
        selected={["strength"]}
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Tags (required), 1 selected" }),
    ).toBeInTheDocument();
  });

  it("names itself as required while nothing is chosen", () => {
    // arrange, act
    render(
      <MultiSelect<Tag>
        label="Tags"
        labels={TAG_LABELS}
        onToggle={vi.fn()}
        options={["strength", "recovery"]}
        required
        selected={[]}
      />,
    );

    // assert
    expect(
      screen.getByRole("button", { name: "Tags (required)" }),
    ).toBeInTheDocument();
  });

  it("stays in Safari's tab order like the select it sits beside", () => {
    // arrange, act
    renderTagFilter([]);

    // assert
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute(
      "tabindex",
      "0",
    );
  });

  it("says how many options are chosen", () => {
    // arrange, act
    renderTagFilter(["strength", "recovery"]);

    // assert
    expect(
      screen.getByRole("button", { name: "Tags, 2 selected" }),
    ).toHaveTextContent(/^Tags2$/);
  });

  it("lists every option with its chosen state", async () => {
    // arrange
    const { user } = renderTagFilter(["recovery"]);

    // act
    await user.click(screen.getByRole("button", { name: "Tags, 1 selected" }));

    // assert
    const list = screen.getByRole("list", { name: "Tags" });
    expect(
      within(list).getByRole("checkbox", { name: /Strength/ }),
    ).not.toBeChecked();
    expect(
      within(list).getByRole("checkbox", { name: /Recovery/ }),
    ).toBeChecked();
  });

  it("names its open list after the field", async () => {
    // arrange
    const { user } = renderTagFilter([]);

    // act
    await user.click(screen.getByRole("button", { name: "Tags" }));

    // assert
    expect(screen.getByRole("dialog", { name: "Tags" })).toBeInTheDocument();
  });

  it("hands back the option that was toggled and stays open for the next one", async () => {
    // arrange
    const { user, onToggle } = renderTagFilter([]);
    await user.click(screen.getByRole("button", { name: "Tags" }));

    // act
    await user.click(screen.getByRole("checkbox", { name: /Strength/ }));

    // assert
    expect(onToggle).toHaveBeenCalledWith("strength");
    expect(screen.getByRole("list", { name: "Tags" })).toBeInTheDocument();
  });
});

describe("a MultiSelect in a form", () => {
  it("shows each chosen name as a pill in the trigger when its summary is names", () => {
    // arrange, act
    render(
      <MultiSelect
        label="Primary muscles"
        labels={{ Glutes: "Glutes", Core: "Core", Lats: "Lats" }}
        onToggle={vi.fn()}
        options={["Glutes", "Core", "Lats"]}
        selected={["Glutes", "Core"]}
        summary="names"
      />,
    );

    // assert
    const trigger = screen.getByRole("button", {
      name: "Primary muscles, 2 selected",
    });
    expect(within(trigger).getByText("Glutes")).toHaveAttribute(
      "data-slot",
      "badge",
    );
    expect(within(trigger).getByText("Core")).toHaveAttribute(
      "data-slot",
      "badge",
    );
  });

  it("shows no name pills when its summary is count", () => {
    // arrange, act
    render(
      <MultiSelect
        label="Primary muscles"
        labels={{ Glutes: "Glutes", Core: "Core", Lats: "Lats" }}
        onToggle={vi.fn()}
        options={["Glutes", "Core", "Lats"]}
        selected={["Glutes", "Core"]}
      />,
    );

    // assert
    const trigger = screen.getByRole("button", {
      name: "Primary muscles, 2 selected",
    });
    expect(within(trigger).queryByText("Glutes")).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent(/^Primary muscles2$/);
  });

  it("shows the label alone when nothing is chosen", () => {
    // arrange, act
    render(
      <MultiSelect
        label="Equipment"
        labels={{ Mat: "Mat" }}
        onToggle={vi.fn()}
        options={["Mat"]}
        selected={[]}
        summary="names"
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Equipment" })).toHaveTextContent(
      /^Equipment$/,
    );
  });

  it("shows a placeholder instead of the label when one is given and nothing is chosen", () => {
    // arrange, act
    render(
      <MultiSelect
        label="Equipment"
        labels={{ Mat: "Mat" }}
        onToggle={vi.fn()}
        options={["Mat"]}
        placeholder="Pick equipment"
        selected={[]}
        summary="names"
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Equipment" })).toHaveTextContent(
      /^Pick equipment$/,
    );
  });

  it("takes an id and the field's problem so a label and its message can point at the trigger", () => {
    // arrange, act
    render(
      <>
        <label htmlFor="muscles">Primary muscles</label>
        <MultiSelect
          aria-describedby="muscles-problem"
          aria-invalid={true}
          id="muscles"
          label="Primary muscles"
          labels={{ Lats: "Lats" }}
          onToggle={vi.fn()}
          options={["Lats"]}
          selected={[]}
        />
        <p id="muscles-problem">Pick at least one primary muscle</p>
      </>,
    );

    // assert
    const trigger = screen.getByRole("button", { name: "Primary muscles" });
    expect(trigger).toHaveAttribute("id", "muscles");
    expect(trigger).toBeInvalid();
    expect(trigger).toHaveAccessibleDescription(
      "Pick at least one primary muscle",
    );
  });
});

describe("a MultiSelect from the keyboard", () => {
  it("opens with Enter and moves focus onto the first option", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES.slice(0, 3));
    await user.tab();

    // act
    await user.keyboard("{Enter}");

    // assert
    const list = screen.getByRole("list", { name: "Primary muscles" });
    expect(within(list).getByRole("checkbox", { name: "Chest" })).toHaveFocus();
  });

  it("moves to the next option with Tab and toggles it with Space", async () => {
    // arrange
    const { user, onToggle } = renderMuscles(MUSCLES.slice(0, 3));
    await user.tab();
    await user.keyboard("{Enter}");

    // act
    await user.tab();
    await user.keyboard(" ");

    // assert
    expect(screen.getByRole("checkbox", { name: "Lats" })).toHaveFocus();
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("Lats");
  });

  it("closes with Escape and hands focus back to the trigger", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES.slice(0, 3));
    await user.tab();
    await user.keyboard("{Enter}");

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Primary muscles" }),
    ).toHaveFocus();
  });
});

describe("searching a long MultiSelect", () => {
  it("offers no search for eight options or fewer", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES.slice(0, 8));

    // act
    await user.click(screen.getByRole("button", { name: "Primary muscles" }));

    // assert
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(
      within(
        screen.getByRole("list", { name: "Primary muscles" }),
      ).getAllByRole("checkbox"),
    ).toHaveLength(8);
  });

  it("opens with focus in the search once there are more than eight options", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES);

    // act
    await user.click(screen.getByRole("button", { name: "Primary muscles" }));

    // assert
    expect(
      screen.getByRole("searchbox", { name: "Search primary muscles" }),
    ).toHaveFocus();
  });

  it("narrows the list to the labels holding the typed text, whatever its case", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES);
    await user.click(screen.getByRole("button", { name: "Primary muscles" }));

    // act
    await user.keyboard("CE");

    // assert
    const list = screen.getByRole("list", { name: "Primary muscles" });
    expect(
      within(list)
        .getAllByRole("checkbox")
        .map((option) => option.closest("label")?.textContent),
    ).toEqual(["Biceps", "Triceps"]);
  });

  it("says No matches when nothing holds the typed text", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES);
    await user.click(screen.getByRole("button", { name: "Primary muscles" }));

    // act
    await user.keyboard("hamstrings");

    // assert
    expect(screen.getByText("No matches")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("closes on Escape from the search", async () => {
    // arrange
    const { user } = renderMuscles(MUSCLES);
    await user.click(screen.getByRole("button", { name: "Primary muscles" }));

    // act
    await user.keyboard("{Escape}");

    // assert
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
