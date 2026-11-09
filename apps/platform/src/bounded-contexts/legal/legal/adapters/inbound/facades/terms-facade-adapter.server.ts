import {
  WEBSITE_AND_STORE_TERMS_DOCUMENT,
  type TermsDocumentDto,
  type TermsFacade,
} from "~/bounded-contexts/legal/public";
import {
  canonicalizeLegalDocument,
  type DocumentHasherPort,
} from "~/bounded-contexts/legal/legal/domain/legal-document";

const TERMS_PDF_DATA_URLS: Record<string, string> = import.meta.glob(
  "../../../artifacts/website-and-store-terms/*/terms-and-conditions.pdf",
  { eager: true, import: "default", query: "?url&inline" },
);
const TERMS_PDF_PATH =
  /\/website-and-store-terms\/([^/]+)\/terms-and-conditions\.pdf$/;
const PDF_CONTENT_TYPE = "application/pdf";
const DATA_URL_PAYLOAD_SEPARATOR = ",";

export class TermsFacadeAdapter implements TermsFacade {
  private readonly terms: { version: string; hash: string };
  private readonly pdfsByVersion: ReadonlyMap<string, Uint8Array>;

  constructor(documentHasherPort: DocumentHasherPort) {
    this.terms = {
      version: WEBSITE_AND_STORE_TERMS_DOCUMENT.version,
      hash: documentHasherPort.hash(
        canonicalizeLegalDocument(WEBSITE_AND_STORE_TERMS_DOCUMENT),
      ),
    };
    this.pdfsByVersion = this.readTermsPdfs();
  }

  currentTerms() {
    return this.terms;
  }

  termsDocument(version: string): TermsDocumentDto | null {
    const content = this.pdfsByVersion.get(version);

    if (!content) {
      return null;
    }

    return {
      filename: `terms-and-conditions-${version}.pdf`,
      contentType: PDF_CONTENT_TYPE,
      content,
    };
  }

  private readTermsPdfs(): ReadonlyMap<string, Uint8Array> {
    return new Map(
      Object.entries(TERMS_PDF_DATA_URLS).flatMap(([path, dataUrl]) => {
        const version = TERMS_PDF_PATH.exec(path)?.[1];

        return version ? [[version, this.decodeDataUrl(dataUrl)]] : [];
      }),
    );
  }

  private decodeDataUrl(dataUrl: string): Uint8Array {
    const payload = dataUrl.slice(
      dataUrl.indexOf(DATA_URL_PAYLOAD_SEPARATOR) + 1,
    );

    return Uint8Array.from(Buffer.from(payload, "base64"));
  }
}
