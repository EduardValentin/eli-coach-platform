// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import { PRIVACY_POLICY, type LegalDocument } from "@eli-coach-platform/content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { LegalDocumentView } from "./legal-document-view";

afterEach(() => {
  cleanup();
});

describe("LegalDocumentView", () => {
  it("renders the complete privacy policy with semantic structure and useful links", () => {
    // arrange
    const expectedSectionHeadings = [
      "About this policy",
      "Controller and contact",
      "Personal data and purposes",
      "Waitlist and marketing communications",
      "Free Store resource requests",
      "Anonymous browser-local cart",
      "Abuse prevention through Cloudflare Turnstile",
      "Transactional email delivery through Resend",
      "Hosting, processors, recipients, and transfers",
      "Retention, anonymization, backups, and logs",
      "Your privacy rights",
      "Complaints to ANSPDCP",
      "Policy changes and versioning",
    ];

    // act
    const { container } = render(
      <MemoryRouter>
        <LegalDocumentView document={PRIVACY_POLICY} />
      </MemoryRouter>,
    );

    // assert
    const article = screen.getByRole("article");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(within(article).getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      within(article).getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(
      within(article)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(expectedSectionHeadings);

    const metadata = within(article).getByText("Version").closest("dl");
    expect(metadata).not.toBeNull();
    expect(within(metadata!).getByText("Version 1.0")).toBeInTheDocument();
    expect(within(metadata!).getByText("Effective date")).toBeInTheDocument();
    expect(within(metadata!).getByText("25 July 2026")).toHaveAttribute(
      "datetime",
      "2026-07-25",
    );

    expect(container.querySelectorAll("dl").length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll("dt").length).toBeGreaterThanOrEqual(12);
    expect(container.querySelectorAll("dd").length).toBeGreaterThanOrEqual(12);
    expect(container.querySelectorAll("ul")).toHaveLength(2);
    expect(container.querySelectorAll("li").length).toBeGreaterThanOrEqual(12);

    expect(
      within(article).getByText(/Evoa Fitness, based in Romania, is the controller/),
    ).toBeInTheDocument();
    expect(
      within(article).getByText(/hosted on Hetzner infrastructure in Germany/),
    ).toBeInTheDocument();
    expect(
      within(article).getByText(/Cloudflare receives Turnstile security data/),
    ).toBeInTheDocument();
    expect(
      within(article).getByText(/Resend receives the recipient address/),
    ).toBeInTheDocument();
    expect(within(article).getAllByText(/24 months/)).toHaveLength(2);
    expect(within(article).getByText(/30-day retention period/)).toBeInTheDocument();
    expect(within(article).getByText(/backups rotate after 14 days/)).toBeInTheDocument();

    for (const right of [
      "give you access to your personal data;",
      "correct inaccurate or incomplete data;",
      "erase data;",
      "restrict processing;",
      "provide portable data where the right applies;",
      "stop processing based on legitimate interests where your rights prevail; and",
      "record withdrawal of consent for future processing.",
    ]) {
      expect(within(article).getByText(right)).toBeInTheDocument();
    }

    const privacyLinks = within(article).getAllByRole("link", {
      name: "privacy@evoa.fit",
    });
    expect(privacyLinks.length).toBeGreaterThan(0);
    for (const link of privacyLinks) {
      expect(link).toHaveAttribute("href", "mailto:privacy@evoa.fit");
    }

    for (const linkName of [
      "Cloudflare Turnstile Privacy Addendum",
      "Cloudflare Data Processing Addendum",
      "Resend Data Processing Addendum",
      "authorized subprocessors",
      "complaint guidance",
    ]) {
      const link = within(article).getByRole("link", { name: linkName });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    expect(within(article).getByRole("link", { name: "/privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(container.querySelector("main")).not.toBeInTheDocument();
    expect(container.querySelector("footer")).not.toBeInTheDocument();
  });

  it("renders ordered legal steps as a native ordered list", () => {
    // arrange
    const orderedListDocument = {
      id: "ordered-list-example",
      version: "1.0",
      effectiveDate: "2026-07-25",
      title: "Ordered steps",
      description: "An ordered legal process.",
      sections: [
        {
          id: "request-process",
          heading: "Request process",
          blocks: [
            {
              kind: "list",
              style: "ordered",
              items: [["Submit your request."], ["Confirm your identity."]],
            },
          ],
        },
      ],
    } as const satisfies LegalDocument;

    // act
    render(
      <MemoryRouter>
        <LegalDocumentView document={orderedListDocument} />
      </MemoryRouter>,
    );

    // assert
    const orderedList = screen.getByRole("list");
    expect(orderedList).toBeInstanceOf(HTMLOListElement);
    expect(
      within(orderedList)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Submit your request.", "Confirm your identity."]);
  });
});
