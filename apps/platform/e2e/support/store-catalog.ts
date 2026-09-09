import { resolveRunId } from "./run-id";

/**
 * The same shapes the management integration suite publishes: a cover is
 * recognised by its PNG signature and a download by its `%PDF-` one, and
 * neither file is ever opened past that. See
 * packages/domain/src/store/product-file-formats.ts.
 */
const COVER_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x11, 0x22,
]);
const DOWNLOAD_BYTES = new TextEncoder().encode(
  "%PDF-1.4 the guide a Library journey downloads",
);

const RUN_ID = resolveRunId();
// Module-scoped like fixtures.ts's email counter: the fixture below is
// test-scoped, so an instance field would restart at one for every journey and
// mint a slug an earlier journey already published.
let sequence = 0;

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

/**
 * Published through the management API rather than seeded, because that is the
 * only supported way a product reaches the Store (docs/STORE_PUBLISHING.md) —
 * and because a product assembled from rows would carry no asset file for a
 * download to hand back.
 *
 * A run interrupted before teardown leaves its product published locally.
 * Nothing collides with it, so there is no sweeper: the slug carries the run id
 * and no journey counts what the Store holds.
 */
export class StoreCatalog {
  private readonly publishedProductIds: number[] = [];

  constructor(private readonly options: StoreCatalogOptions) {}

  async publishFixtureProduct(): Promise<FixtureProduct> {
    sequence += 1;

    // Namespaced by run: a slug is immutable once published, so a rerun on the
    // same database must not collide with what the previous one left behind.
    const slug = `journey-guide-${RUN_ID}-${sequence}`;
    const title = `Journey Guide ${RUN_ID}-${sequence}`;
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
      downloadByteLength: DOWNLOAD_BYTES.byteLength,
      id: publication.productId,
      title,
    };
  }

  /**
   * Retirement, not deletion: it is the only teardown the management API
   * offers, it is idempotent, and it leaves the product invisible to the Store
   * while the rows a journey wrote against it stay valid.
   */
  /** Retires every fixture product before reporting, so one refusal cannot leak the rest. */
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
      // The slug is unique to this run, so it settles the idempotency key too.
      idempotencyKey: product.slug,
      includedItems: ["One guide"],
      slug: product.slug,
      title: product.title,
      typeSlugs: ["e-books"],
    }),
  );
  formData.set("cover", new File([COVER_BYTES], "cover.png"));
  formData.set("file0", new File([DOWNLOAD_BYTES], "guide.pdf"));

  return formData;
}
