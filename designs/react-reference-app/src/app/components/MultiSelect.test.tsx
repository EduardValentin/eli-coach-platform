import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MultiSelect } from "./MultiSelect";
import { FIELD_TAB_INDEX } from "./ui/select";

type Tag = "strength" | "recovery";

const LABELS: Record<Tag, string> = { strength: "Strength", recovery: "Recovery" };

function renderFilter(selected: Tag[]) {
  const onToggle = vi.fn();
  render(
    <MultiSelect<Tag>
      label="Tags"
      selected={selected}
      options={["strength", "recovery"]}
      labels={LABELS}
      counts={{ strength: 7, recovery: 2 }}
      onToggle={onToggle}
    />,
  );
  return { user: userEvent.setup(), onToggle };
}

describe("MultiSelect", () => {
  it("is named for the filter while nothing is chosen", () => {
    // arrange
    // act
    renderFilter([]);

    // assert
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute("data-size", "sm");
  });

  it("stays in Safari's tab order like the select it sits beside", () => {
    // arrange
    // act
    renderFilter([]);

    // assert
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute("tabindex", String(FIELD_TAB_INDEX));
  });

  it("says how many options are chosen", () => {
    // arrange
    // act
    renderFilter(["strength", "recovery"]);

    // assert
    expect(screen.getByRole("button", { name: "Tags, 2 selected" })).toHaveTextContent("2");
  });

  it("lists every option with its count and its chosen state", async () => {
    // arrange
    const { user } = renderFilter(["recovery"]);

    // act
    await user.click(screen.getByRole("button", { name: "Tags, 1 selected" }));

    // assert
    const list = screen.getByRole("list", { name: "Tags" });
    expect(within(list).getByRole("checkbox", { name: /Strength/ })).not.toBeChecked();
    expect(within(list).getByRole("checkbox", { name: /Recovery/ })).toBeChecked();
    expect(within(list).getByText("7")).toBeInTheDocument();
    expect(within(list).getByText("2")).toBeInTheDocument();
  });

  it("hands back the option that was toggled and stays open for the next one", async () => {
    // arrange
    const { user, onToggle } = renderFilter([]);
    await user.click(screen.getByRole("button", { name: "Tags" }));

    // act
    await user.click(screen.getByRole("checkbox", { name: /Strength/ }));

    // assert
    expect(onToggle).toHaveBeenCalledWith("strength");
    expect(screen.getByRole("list", { name: "Tags" })).toBeInTheDocument();
  });
});

describe("a MultiSelect in a form", () => {
  it("shows the chosen names in the trigger when summary is names", () => {
    // arrange
    // act
    render(
      <MultiSelect
        label="Primary muscles"
        selected={["Glutes", "Core"]}
        options={["Glutes", "Core", "Lats"]}
        labels={{ Glutes: "Glutes", Core: "Core", Lats: "Lats" }}
        summary="names"
        onToggle={() => {}}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Primary muscles, 2 selected" })).toHaveTextContent("Glutes, Core");
  });

  it("shows the label alone when nothing is chosen", () => {
    // arrange
    // act
    render(
      <MultiSelect
        label="Equipment"
        selected={[]}
        options={["Mat"]}
        labels={{ Mat: "Mat" }}
        summary="names"
        onToggle={() => {}}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Equipment" })).toHaveTextContent("Equipment");
  });

  it("shows a placeholder instead of the label when one is given and nothing is chosen", () => {
    // arrange
    // act
    render(
      <MultiSelect
        label="Equipment"
        selected={[]}
        options={["Mat"]}
        labels={{ Mat: "Mat" }}
        summary="names"
        placeholder="Pick equipment"
        onToggle={() => {}}
      />,
    );

    // assert
    expect(screen.getByRole("button", { name: "Equipment" })).toHaveTextContent(/^Pick equipment$/);
  });

  it("renders no count badge for an option when no counts are given", async () => {
    // arrange
    const user = userEvent.setup();
    render(
      <MultiSelect label="Equipment" selected={[]} options={["Mat"]} labels={{ Mat: "Mat" }} onToggle={() => {}} />,
    );

    // act
    await user.click(screen.getByRole("button", { name: "Equipment" }));

    // assert
    expect(screen.getByRole("checkbox", { name: "Mat" })).toBeInTheDocument();
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it("takes an id so a label can point at the trigger", () => {
    // arrange
    // act
    render(
      <>
        <label htmlFor="muscles">Primary muscles</label>
        <MultiSelect
          id="muscles"
          label="Primary muscles"
          selected={[]}
          options={["Lats"]}
          labels={{ Lats: "Lats" }}
          onToggle={() => {}}
        />
      </>,
    );

    // assert
    expect(screen.getByRole("button", { name: "Primary muscles" })).toHaveAttribute("id", "muscles");
  });
});
