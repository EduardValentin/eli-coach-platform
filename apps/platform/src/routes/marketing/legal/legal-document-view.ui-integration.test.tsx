// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { LegalDocument } from "@eli-coach-platform/content";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import { LegalDocumentView } from "./legal-document-view";

afterEach(() => {
  cleanup();
});

const LEGAL_DOCUMENT_FIXTURE = {
  id: "internal-legal-link",
  version: "1.0",
  effectiveDate: "2026-07-26",
  title: "Internal legal link",
  description: "A legal document that links to the privacy policy.",
  sections: [
    {
      id: "privacy",
      heading: "Privacy",
      blocks: [
        {
          kind: "paragraph",
          content: [
            "Read the ",
            { href: "/privacy", label: "Privacy Policy", scope: "internal" },
            ".",
          ],
        },
      ],
    },
  ],
} as const satisfies LegalDocument;

function createLegalDocumentRouter() {
  return createMemoryRouter(
    [
      {
        element: <LegalDocumentView document={LEGAL_DOCUMENT_FIXTURE} />,
        path: "/",
      },
      {
        element: <h1>Privacy page</h1>,
        path: "/privacy",
      },
    ],
    {
      basename: "/evoa",
      initialEntries: ["/evoa"],
    },
  );
}

describe("LegalDocumentView internal legal navigation", () => {
  it("leaves internal legal navigation to the browser under a basename", async () => {
    // arrange
    const user = userEvent.setup();
    const router = createLegalDocumentRouter();
    const initialPathname = router.state.location.pathname;
    const preventDocumentNavigation = (event: MouseEvent) => {
      event.preventDefault();
    };

    render(<RouterProvider router={router} />);

    const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });

    document.addEventListener("click", preventDocumentNavigation);

    try {
      // act
      await user.click(privacyLink);

      // assert
      expect(privacyLink).toHaveAttribute("href", "/evoa/privacy");
      expect(initialPathname).toBe("/evoa");
      expect(router.state.location.pathname).toBe(initialPathname);
    } finally {
      document.removeEventListener("click", preventDocumentNavigation);
    }
  });
});
