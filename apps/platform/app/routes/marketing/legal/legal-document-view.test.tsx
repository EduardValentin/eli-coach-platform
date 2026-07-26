// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";

import type { LegalDocument } from "@eli-coach-platform/content";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";

import { LegalDocumentView } from "./legal-document-view";

afterEach(() => {
  cleanup();
});

const LEGAL_DOCUMENT_FIXTURE = {
  id: "legal-document-example",
  version: "1.0",
  effectiveDate: "2026-07-25",
  title: "Example policy",
  description: "A fixture that exercises every supported legal-document block.",
  sections: [
    {
      id: "supported-blocks",
      heading: "Supported blocks",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Read the ",
            {
              href: "/legal-example",
              label: "internal policy",
              scope: "internal",
            },
            ", email ",
            {
              href: "mailto:privacy@example.test",
              label: "privacy support",
              scope: "external",
            },
            ", or consult the ",
            {
              href: "https://example.test/privacy",
              label: "external guidance",
              scope: "external",
            },
            ".",
          ],
        },
        {
          kind: "definition-list",
          items: [
            {
              term: "Controller",
              description: ["The responsible organization."],
            },
            {
              term: "Processor",
              description: ["A service provider acting on instructions."],
            },
          ],
        },
        {
          kind: "list",
          items: [["One available choice."], ["Another available choice."]],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;

describe("LegalDocumentView", () => {
  it("renders each legal block with native semantics and safe link behavior", () => {
    // arrange
    // act
    render(
      <MemoryRouter>
        <LegalDocumentView document={LEGAL_DOCUMENT_FIXTURE} />
      </MemoryRouter>,
    );

    // assert
    const article = screen.getByRole("article");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(within(article).getAllByRole("heading", { level: 1, name: /\S/ })).toHaveLength(
      1,
    );
    expect(within(article).getAllByRole("heading", { level: 2, name: /\S/ })).toHaveLength(
      LEGAL_DOCUMENT_FIXTURE.sections.length,
    );
    expect(article.querySelectorAll(":scope > div > section")).toHaveLength(1);

    const metadata = article.querySelector("header dl");
    expect(metadata).not.toBeNull();
    expect(metadata?.querySelectorAll("dt")).toHaveLength(2);
    expect(metadata?.querySelectorAll("dd")).toHaveLength(2);
    expect(metadata?.querySelector("time")).toHaveAttribute(
      "datetime",
      LEGAL_DOCUMENT_FIXTURE.effectiveDate,
    );

    const definitionLists = article.querySelectorAll("section dl");
    expect(definitionLists).toHaveLength(1);
    expect(definitionLists[0]?.querySelectorAll("dt")).toHaveLength(2);
    expect(definitionLists[0]?.querySelectorAll("dd")).toHaveLength(2);

    const lists = within(article).getAllByRole("list");
    expect(lists).toHaveLength(1);
    expect(lists[0]).toBeInstanceOf(HTMLUListElement);
    for (const list of lists) {
      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    }

    const links = within(article).getAllByRole("link", { name: /\S/ });
    const internalLinks = links.filter(
      (link) => link.getAttribute("href") === "/legal-example",
    );
    const mailLinks = links.filter((link) => link.getAttribute("href")?.startsWith("mailto:"));
    const externalLinks = links.filter((link) => link.getAttribute("href")?.startsWith("https:"));

    expect(internalLinks).toHaveLength(1);
    expect(mailLinks).toHaveLength(1);
    expect(externalLinks).toHaveLength(1);
    for (const link of [...mailLinks, ...internalLinks]) {
      expect(link).not.toHaveAttribute("target");
    }
    for (const link of externalLinks) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.queryByRole("main")).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });
});
