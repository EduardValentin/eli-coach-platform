import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CountedMultiSelect } from "./CountedMultiSelect";

type Tag = "strength" | "recovery";

const LABELS: Record<Tag, string> = { strength: "Strength", recovery: "Recovery" };

function renderFilter(selected: Tag[]) {
  const onToggle = vi.fn();
  render(
    <CountedMultiSelect<Tag>
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

describe("CountedMultiSelect", () => {
  it("is named for the filter while nothing is chosen", () => {
    // arrange
    // act
    renderFilter([]);

    // assert
    expect(screen.getByRole("button", { name: "Tags" })).toHaveAttribute("data-size", "sm");
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
