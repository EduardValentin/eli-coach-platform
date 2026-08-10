// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BundleSelector } from "./bundle-selector";

afterEach(() => {
  cleanup();
});

describe("BundleSelector", () => {
  it("renders the public bundle cards and shared benefits once", () => {
    // arrange
    const waitlistMode = false;

    // act
    render(<BundleSelector waitlistMode={waitlistMode} />);

    const bundleHeading = screen.getByRole("heading", {
      name: "Coaching bundle options",
    });
    const cards = screen.getAllByRole("article");

    // assert
    expect(bundleHeading).toBeInTheDocument();
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByRole("heading", { name: "1 Month" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "3 Months" })).toBeInTheDocument();
    expect(within(cards[2]).getByRole("heading", { name: "6 Months" })).toBeInTheDocument();
    expect(screen.queryByText("Quarterly")).not.toBeInTheDocument();
    expect(screen.queryByText("Biannual")).not.toBeInTheDocument();
    expect(screen.queryByText("Annual")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's included in every plan" })).toBeInTheDocument();
    expect(screen.getAllByText("Personalized workout and nutrition program")).toHaveLength(1);
    expect(screen.getAllByText("Access to the private community")).toHaveLength(1);
  });

  it("shows normal popularity and savings badges", () => {
    // arrange
    const waitlistMode = false;

    // act
    render(<BundleSelector waitlistMode={waitlistMode} />);

    // assert
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Save 6%")).toBeInTheDocument();
    expect(screen.getByText("Save 12%")).toBeInTheDocument();
    expect(screen.getByLabelText("3 Months monthly price €149")).toBeInTheDocument();
    expect(screen.queryByText("Waitlist pricing — reserved for early signups")).not.toBeInTheDocument();
  });

  it("shows all-bundle waitlist pricing in waitlist mode", () => {
    // arrange
    const waitlistOfferPlan = "all-bundles";

    // act
    render(<BundleSelector waitlistMode waitlistOfferPlan={waitlistOfferPlan} />);

    // assert
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Waitlist pricing — reserved for early signups")).toBeInTheDocument();
    expect(screen.queryByText("Save 6%")).not.toBeInTheDocument();
    expect(screen.queryByText("Save 12%")).not.toBeInTheDocument();
    expect(screen.getByText("Save 10%")).toBeInTheDocument();
    expect(screen.getByText("Save 14%")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 1 month monthly price €159")).toBeInTheDocument();
    expect(screen.getByLabelText("1 Month monthly price €139")).toBeInTheDocument();
    expect(screen.getByText("Billed monthly")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 3 months monthly price €149")).toBeInTheDocument();
    expect(screen.getByLabelText("3 Months monthly price €125")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 3 months billing total €447")).toBeInTheDocument();
    expect(screen.getByText("Billed as €375")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 6 months monthly price €139")).toBeInTheDocument();
    expect(screen.getByLabelText("6 Months monthly price €119")).toBeInTheDocument();
    expect(screen.getByLabelText("Original 6 months billing total €834")).toBeInTheDocument();
    expect(screen.getByText("Billed as €714")).toBeInTheDocument();
  });

  it("keeps normal pricing when waitlist mode is off for an all-bundle offer", () => {
    // arrange
    const waitlistOfferPlan = "all-bundles";

    // act
    render(<BundleSelector waitlistMode={false} waitlistOfferPlan={waitlistOfferPlan} />);

    // assert
    expect(screen.queryByText("Waitlist pricing — reserved for early signups")).not.toBeInTheDocument();
    expect(screen.getByText("Save 6%")).toBeInTheDocument();
    expect(screen.getByText("Save 12%")).toBeInTheDocument();
    expect(screen.getByLabelText("3 Months monthly price €149")).toBeInTheDocument();
  });
});
