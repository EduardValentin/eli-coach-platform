import { resolveRunId } from "./run-id";

const PNG_SIGNATURE_COVER_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x11, 0x22,
]);
const PDF_SIGNATURE_DOWNLOAD_BYTES = new TextEncoder().encode(
  "%PDF-1.4 the guide a Library journey downloads",
);

const RUN_ID = resolveRunId();
let publishedProductsThisRun = 0;

export type FixtureProduct = {
  customerFilename: string;
  downloadByteLength: number;
  id: number;
  title: string;
};

type PublicationBody = {
  publication: { productId: number };
};

type StoreCatalogOptions = {
  baseUrl: string;
  managementSecret: string;
};

export class StoreCatalog {
  private readonly publishedProductIds: number[] = [];

  constructor(private readonly options: StoreCatalogOptions) {}

  async publishFixtureProduct(): Promise<FixtureProduct> {
    publishedProductsThisRun += 1;

    const slug = `journey-guide-${RUN_ID}-${publishedProductsThisRun}`;
    const title = `Journey Guide ${RUN_ID}-${publishedProductsThisRun}`;
    const customerFilename = `${title}.pdf`;
    const response = await fetch(
      `${this.options.baseUrl}/api/management/store/products`,
      {
        body: publicationForm({ customerFilename, slug, title }),
        headers: { authorization: this.credential() },
        method: "POST",
      },
    );

    if (response.status !== 201) {
      throw new Error(
        `Publishing ${slug} answered ${response.status}: ${await response.text()}`,
      );
    }

    const { publication } = (await response.json()) as PublicationBody;
    this.publishedProductIds.push(publication.productId);

    return {
      customerFilename,
      downloadByteLength: PDF_SIGNATURE_DOWNLOAD_BYTES.byteLength,
      id: publication.productId,
      title,
    };
  }

  async retirePublishedProducts(): Promise<void> {
    const refusals: string[] = [];

    for (const productId of this.publishedProductIds) {
      const response = await fetch(
        `${this.options.baseUrl}/api/management/store/products/${productId}`,
        { headers: { authorization: this.credential() }, method: "PATCH" },
      );

      if (response.status !== 200) {
        refusals.push(`product ${productId} answered ${response.status}`);
      }
    }

    this.publishedProductIds.length = 0;

    if (refusals.length > 0) {
      throw new Error(`Retiring fixture products failed: ${refusals.join("; ")}.`);
    }
  }

  private credential(): string {
    return `Bearer ${this.options.managementSecret}`;
  }
}

function publicationForm(product: {
  customerFilename: string;
  slug: string;
  title: string;
}): FormData {
  const formData = new FormData();

  formData.set(
    "metadata",
    JSON.stringify({
      cardSummary: "A fixture the Library journey owns and downloads.",
      coverAlt: `Cover of ${product.title}.`,
      creatorName: "Eli Lungu",
      detailDescription:
        "A fixture product published by the Playwright Library journey.",
      downloads: [
        { customerFilename: product.customerFilename, field: "file0" },
      ],
      goalSlugs: ["wellness"],
      idempotencyKey: product.slug,
      includedItems: ["One guide"],
      slug: product.slug,
      title: product.title,
      typeSlugs: ["e-books"],
    }),
  );
  formData.set("cover", new File([PNG_SIGNATURE_COVER_BYTES], "cover.png"));
  formData.set("file0", new File([PDF_SIGNATURE_DOWNLOAD_BYTES], "guide.pdf"));

  return formData;
}
