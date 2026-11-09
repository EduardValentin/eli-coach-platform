import { describe, expect, it } from "vitest";

import { WEBSITE_AND_STORE_TERMS_DOCUMENT } from "~/bounded-contexts/legal/public";

import { TermsFacadeAdapter } from "./terms-facade-adapter.server";

const PDF_SIGNATURE = "%PDF-";

function createFacade(): TermsFacadeAdapter {
  return new TermsFacadeAdapter({ hash: () => "hash" });
}

describe("TermsFacadeAdapter", () => {
  it("hands out the durable PDF of a published Terms version", () => {
    // arrange
    const termsFacade = createFacade();

    // act
    const document = termsFacade.termsDocument(
      WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
    );

    // assert
    expect(document).toMatchObject({
      contentType: "application/pdf",
      filename: `terms-and-conditions-${WEBSITE_AND_STORE_TERMS_DOCUMENT.version}.pdf`,
    });
    expect(
      new TextDecoder().decode(
        document?.content.slice(0, PDF_SIGNATURE.length),
      ),
    ).toBe(PDF_SIGNATURE);
  });

  it("has no document for a version that was never published", () => {
    // arrange
    const termsFacade = createFacade();

    // act
    const document = termsFacade.termsDocument("0.9");

    // assert
    expect(document).toBeNull();
  });
});
