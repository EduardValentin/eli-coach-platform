// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./accordion";

afterEach(() => {
  cleanup();
});

function OnboardingForms(props: { defaultValue?: string[] }) {
  return (
    <Accordion defaultValue={props.defaultValue} type="multiple">
      <AccordionItem value="health">
        <AccordionTrigger>Health screening</AccordionTrigger>
        <AccordionContent>No injuries reported.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="lifestyle">
        <AccordionTrigger>Lifestyle</AccordionTrigger>
        <AccordionContent>Sleeps eight hours.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

describe("Accordion", () => {
  it("heads each section with a collapsed trigger button", () => {
    // arrange, act
    render(<OnboardingForms />);

    // assert
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Health screening" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No injuries reported.")).not.toBeInTheDocument();
  });

  it("opens a section from its trigger", async () => {
    // arrange
    const user = userEvent.setup();
    render(<OnboardingForms />);

    // act
    await user.click(screen.getByRole("button", { name: "Health screening" }));

    // assert
    expect(
      screen.getByRole("button", { name: "Health screening" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("region", { name: "Health screening" }),
    ).toHaveTextContent("No injuries reported.");
  });

  it("opens a section from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<OnboardingForms />);
    await user.tab();

    // act
    await user.keyboard("{Enter}");

    // assert
    expect(
      screen.getByRole("region", { name: "Health screening" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Lifestyle" }),
    ).not.toBeInTheDocument();
  });

  it("closes an open section from the keyboard", async () => {
    // arrange
    const user = userEvent.setup();
    render(<OnboardingForms defaultValue={["health"]} />);
    await user.tab();

    // act
    await user.keyboard(" ");

    // assert
    expect(
      screen.getByRole("button", { name: "Health screening" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("No injuries reported.")).not.toBeInTheDocument();
  });

  it("moves between triggers with the arrow keys", async () => {
    // arrange
    const user = userEvent.setup();
    render(<OnboardingForms />);
    await user.tab();

    // act
    await user.keyboard("{ArrowDown}");

    // assert
    expect(screen.getByRole("button", { name: "Lifestyle" })).toHaveFocus();
  });

  it("starts with the named sections open", () => {
    // arrange, act
    render(<OnboardingForms defaultValue={["health", "lifestyle"]} />);

    // assert
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });

  it("hides the trigger's chevron from assistive technology", () => {
    // arrange, act
    render(<OnboardingForms />);

    // assert
    expect(
      screen.getByRole("button", { name: "Lifestyle" }).querySelector("svg"),
    ).toHaveAttribute("aria-hidden", "true");
  });
});
