import { PAID_DIGITAL_DELIVERY_CONSENT } from "~/bounded-contexts/legal/public";
import { describe, expect, it, vi } from "vitest";

import { LegalOrderTermsAdapter } from "./legal-order-terms-adapter.server";

const document = {
  filename: "terms-and-conditions-1.0.pdf",
  contentType: "application/pdf",
  content: new Uint8Array([37, 80, 68, 70]),
};

function createTermsFacade(found: typeof document | null) {
  return {
    currentTerms: () => ({ version: "1.0", hash: "hash" }),
    termsDocument: vi.fn().mockReturnValue(found),
  };
}

describe("LegalOrderTermsAdapter", () => {
  it("pairs the accepted version's PDF with the paid-delivery consent wording", () => {
    // arrange
    const termsFacade = createTermsFacade(document);
    const adapter = new LegalOrderTermsAdapter(termsFacade);

    // act
    const terms = adapter.find("1.0");

    // assert
    expect(termsFacade.termsDocument).toHaveBeenCalledWith("1.0");
    expect(terms).toEqual({
      version: "1.0",
      document,
      deliveryConfirmationNotice:
        PAID_DIGITAL_DELIVERY_CONSENT.confirmationNotice,
    });
  });

  it("finds nothing for a version without a published PDF", () => {
    // arrange
    const adapter = new LegalOrderTermsAdapter(createTermsFacade(null));

    // act
    const terms = adapter.find("0.9");

    // assert
    expect(terms).toBeNull();
  });
});
