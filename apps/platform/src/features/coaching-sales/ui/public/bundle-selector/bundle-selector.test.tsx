// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import {
  COACHING_BUNDLES,
  type PriceTier,
} from "@eli-coach-platform/domain/coaching-bundle";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { presentBundleCards } from "~/features/coaching-sales/contracts/bundle-cards";

import { BundleSelector } from "./bundle-selector";

afterEach(() => {
  cleanup();
});

function cardsFor(tier: PriceTier) {
  return presentBundleCards(COACHING_BUNDLES, tier);
}

describe("BundleSelector", () => {
  it("renders the public bundle cards and shared benefits once", () => {
    // arrange
    const cards = cardsFor("regular");

    // act
    render(<BundleSelector cards={cards} mode="public" />);

    // assert
    expect(
      screen.getByRole("heading", { name: "Coaching bundle options" }),
    ).toBeInTheDocument();
    const articleCards = screen.getAllByRole("article");
    expect(articleCards).toHaveLength(3);
    expect(
      within(articleCards[0]).getByRole("heading", { name: "1 Month" }),
    ).toBeInTheDocument();
    expect(
      within(articleCards[1]).getByRole("heading", { name: "3 Months" }),
    ).toBeInTheDocument();
    expect(
      within(articleCards[2]).getByRole("heading", { name: "6 Months" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "What's included in every plan" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getByText("2 live training sessions per month"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue to Checkout" }),
    ).not.toBeInTheDocument();
  });

  it("shows normal popularity and savings badges", () => {
    // arrange
    const cards = cardsFor("regular");

    // act
    render(<BundleSelector cards={cards} mode="public" pricing="regular" />);

    // assert
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Save 6%")).toBeInTheDocument();
    expect(screen.getByText("Save 12%")).toBeInTheDocument();
    expect(
      screen.getByLabelText("3 Months monthly price €149"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Waitlist pricing — reserved for early signups"),
    ).not.toBeInTheDocument();
  });

  it("shows all-bundle waitlist pricing in waitlist mode", () => {
    // arrange
    const cards = cardsFor("reduced");

    // act
    render(<BundleSelector cards={cards} mode="public" pricing="waitlist" />);

    // assert
    expect(
      screen.getByText("Waitlist pricing — reserved for early signups"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Save 6%")).not.toBeInTheDocument();
    expect(screen.getByText("Save 10%")).toBeInTheDocument();
    expect(screen.getByText("Save 14%")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Original 1 month monthly price €159"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("1 Month monthly price €139"),
    ).toBeInTheDocument();
    expect(screen.getByText("Billed monthly")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Original 3 months billing total €447"),
    ).toBeInTheDocument();
    expect(screen.getByText("Billed as €375")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Original 6 months billing total €834"),
    ).toBeInTheDocument();
    expect(screen.getByText("Billed as €714")).toBeInTheDocument();
  });

  it("offers the bundles as one radio group with the chosen one checked", () => {
    // arrange
    const cards = cardsFor("reduced");

    // act
    render(
      <BundleSelector
        cards={cards}
        mode="checkout"
        onChooseBundle={vi.fn()}
        pricing="reduced"
        selectedBundleId="3-months"
      />,
    );

    // assert
    expect(
      screen.getByText("Your reduced price — held for you"),
    ).toBeInTheDocument();
    const group = screen.getByRole("radiogroup", {
      name: "Coaching bundle options",
    });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "3 Months" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "1 Month" })).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Continue to Checkout" }),
    ).toBeEnabled();
  });

  it("reports the bundle a person picks", async () => {
    // arrange
    const user = userEvent.setup();
    const onChooseBundle = vi.fn();
    render(
      <BundleSelector
        cards={cardsFor("regular")}
        mode="checkout"
        onChooseBundle={onChooseBundle}
        selectedBundleId="3-months"
      />,
    );

    // act
    await user.click(screen.getByRole("radio", { name: "6 Months" }));

    // assert
    expect(onChooseBundle).toHaveBeenCalledWith("6-months");
  });

  it("shows the note and the content placed before the checkout action", () => {
    // arrange
    const note = "Each bundle is a subscription.";

    // act
    render(
      <BundleSelector
        beforeCheckout={<p>Pick a start</p>}
        cards={cardsFor("regular")}
        mode="checkout"
        note={note}
        onChooseBundle={vi.fn()}
        selectedBundleId="3-months"
      />,
    );

    // assert
    expect(screen.getByText(note)).toBeInTheDocument();
    expect(screen.getByText("Pick a start")).toBeInTheDocument();
  });

  it("announces the opening checkout while busy", () => {
    // arrange
    const cards = cardsFor("regular");

    // act
    render(
      <BundleSelector
        busy
        cards={cards}
        mode="checkout"
        onChooseBundle={vi.fn()}
        selectedBundleId="3-months"
      />,
    );

    // assert
    const action = screen.getByRole("button", { name: "Opening checkout…" });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("aria-busy", "true");
  });

  it("disables every bundle and hides the checkout action when disabled", () => {
    // arrange
    const cards = cardsFor("regular");

    // act
    render(
      <BundleSelector
        beforeCheckout={<p>Pick a start</p>}
        cards={cards}
        disabled
        mode="checkout"
        onChooseBundle={vi.fn()}
        selectedBundleId="3-months"
      />,
    );

    // assert
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Pick a start")).not.toBeInTheDocument();
  });
});
