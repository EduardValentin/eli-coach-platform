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
    render(<BundleSelector waitlistMode={false} />);

    const bundleHeading = screen.getByRole("heading", {
      name: "Coaching bundle options",
    });
    const cards = screen.getAllByRole("article");

    expect(bundleHeading).toBeInTheDocument();
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByRole("heading", { name: "Quarterly" })).toBeInTheDocument();
    expect(within(cards[1]).getByRole("heading", { name: "Biannual" })).toBeInTheDocument();
    expect(within(cards[2]).getByRole("heading", { name: "Annual" })).toBeInTheDocument();
    expect(screen.queryByText("3 months")).not.toBeInTheDocument();
    expect(screen.queryByText("6 months")).not.toBeInTheDocument();
    expect(screen.queryByText("12 months")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What's included in every plan" })).toBeInTheDocument();
    expect(screen.getAllByText("Personalized workout and nutrition program")).toHaveLength(1);
    expect(screen.getAllByText("Access to the private community")).toHaveLength(1);
  });

  it("shows normal popularity and savings badges", () => {
    render(<BundleSelector waitlistMode={false} />);

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Save 12%")).toBeInTheDocument();
    expect(screen.getByText("Save 24%")).toBeInTheDocument();
    expect(screen.getByLabelText("Annual monthly price $190")).toBeInTheDocument();
    expect(screen.queryByText("Waitlist price")).not.toBeInTheDocument();
  });

  it("shows annual waitlist pricing in waitlist mode", () => {
    render(<BundleSelector waitlistMode waitlistOfferPlan="12-months" />);

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("Waitlist price")).toBeInTheDocument();
    expect(screen.getByText("Save 12%")).toBeInTheDocument();
    expect(screen.queryByText("Save 24%")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Original annual monthly price $190")).toBeInTheDocument();
    expect(screen.getByLabelText("Annual monthly price $150")).toBeInTheDocument();
    expect(screen.getByLabelText("Original annual billing total $2280")).toBeInTheDocument();
    expect(screen.getByText("Billed as $1800")).toBeInTheDocument();
  });

  it("does not show annual waitlist pricing when another plan offer is active", () => {
    render(<BundleSelector waitlistMode waitlistOfferPlan="6-months" />);

    expect(screen.queryByText("Waitlist price")).not.toBeInTheDocument();
    expect(screen.getByText("Save 24%")).toBeInTheDocument();
    expect(screen.getByLabelText("Annual monthly price $190")).toBeInTheDocument();
  });
});
