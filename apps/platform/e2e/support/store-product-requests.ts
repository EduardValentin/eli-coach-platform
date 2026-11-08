import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";
import type { StorePrice } from "~/bounded-contexts/sales/store/public/store-currency";

import { answerOf, type ApiAnswer } from "./api-answers";
import {
  japaneseMenuPdf,
  stretchingPhotoWebp,
  type SampleResource,
} from "./sample-resources";
import { recordStoreProduct } from "./store-products";

export type StoreProductListing = {
  slug: string;
  title: string;
  prices: StorePrice | null;
};

type PublishedProductAnswer = { publication: { productId: number } };

const PRODUCTS_PATH = "/api/management/store/products";

const DOWNLOAD_FIELD = "file0";

const PUBLISHED = 201;

export class StoreProductRequests {
  constructor(
    private readonly request: APIRequestContext,
    private readonly runId: string,
  ) {}

  private metadataOf({ slug, title, prices }: StoreProductListing) {
    return {
      slug,
      idempotencyKey: randomUUID(),
      title,
      creatorName: "Eli Lungu",
      cardSummary: `A week of guided sessions from ${title}.`,
      detailDescription: `${title} walks through one training week, session by session.`,
      includedItems: ["A printable training week"],
      coverAlt: `Cover of ${title}.`,
      typeSlugs: ["e-books"],
      goalSlugs: ["wellness"],
      downloads: [{ field: DOWNLOAD_FIELD, customerFilename: `${slug}.pdf` }],
      ...(prices ? { prices } : {}),
    };
  }

  private async publicationPartsOf(
    listing: StoreProductListing,
  ): Promise<FormData> {
    const parts = new FormData();

    parts.append("metadata", JSON.stringify(this.metadataOf(listing)));
    parts.append("cover", this.fileOf(await stretchingPhotoWebp()));
    parts.append(DOWNLOAD_FIELD, this.fileOf(japaneseMenuPdf()));

    return parts;
  }

  private fileOf(sample: SampleResource): File {
    return new File([new Uint8Array(sample.buffer)], sample.name, {
      type: sample.mimeType,
    });
  }

  private requirePublished(answer: ApiAnswer, attempt: string): void {
    if (answer.status !== PUBLISHED) {
      throw new Error(
        `${attempt} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async publishAccepted(listing: StoreProductListing): Promise<number> {
    recordStoreProduct(listing.slug, this.runId);
    const answer = await answerOf(
      await this.request.post(PRODUCTS_PATH, {
        multipart: await this.publicationPartsOf(listing),
      }),
    );

    this.requirePublished(answer, `Publishing ${listing.title}`);

    return (answer.body as PublishedProductAnswer).publication.productId;
  }

  async changePricesAccepted(
    productId: number,
    prices: StorePrice | null,
  ): Promise<void> {
    const answer = await answerOf(
      await this.request.post(`${PRODUCTS_PATH}/${productId}/prices`, {
        data: { idempotencyKey: randomUUID(), prices },
      }),
    );

    this.requirePublished(answer, `Repricing product ${productId}`);
  }
}
