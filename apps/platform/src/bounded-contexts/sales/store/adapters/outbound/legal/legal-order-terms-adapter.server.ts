import type {
  OrderTerms,
  OrderTermsPort,
} from "~/bounded-contexts/sales/store/domain/order";
import type { TermsFacade } from "~/bounded-contexts/legal/public";

export class LegalOrderTermsAdapter implements OrderTermsPort {
  constructor(private readonly termsFacade: TermsFacade) {}

  find(version: string): OrderTerms | null {
    const document = this.termsFacade.termsDocument(version);

    if (!document) {
      return null;
    }

    return {
      version,
      document,
    };
  }
}
