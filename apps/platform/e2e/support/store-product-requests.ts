import { randomUUID } from "node:crypto";

import type { APIRequestContext } from "@playwright/test";
import type { ProductPricingRequest } from "~/bounded-contexts/sales/store/public/store-management";

import { answerOf, type ApiAnswer } from "./api-answers";
import {
  fileOf,
  japaneseMenuPdf,
  stretchingPhotoWebp,
} from "./sample-resources";

export type StoreProductFields = {
  slug: string;
  title: string;
  pricing: ProductPricingRequest;
};

type PublishedProductAnswer = { publication: { productId: number } };

const PRODUCTS_PATH = "/api/management/store/products";

const DOWNLOAD_FIELD = "file0";

const PUBLISHED = 201;

export class StoreProductRequests {
  constructor(
    private readonly request: APIRequestContext,
    private readonly recordPublishing: (slug: string) => void,
  ) {}

  private metadataOf({ slug, title, pricing }: StoreProductFields) {
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
      pricing,
    };
  }

  private async publicationPartsOf(
    fields: StoreProductFields,
  ): Promise<FormData> {
    const parts = new FormData();

    parts.append("metadata", JSON.stringify(this.metadataOf(fields)));
    parts.append("cover", fileOf(await stretchingPhotoWebp()));
    parts.append(DOWNLOAD_FIELD, fileOf(japaneseMenuPdf()));

    return parts;
  }

  private requirePublished(answer: ApiAnswer, attempt: string): void {
    if (answer.status !== PUBLISHED) {
      throw new Error(
        `${attempt} answered ${answer.status}: ${JSON.stringify(answer.body)}.`,
      );
    }
  }

  async publishAccepted(fields: StoreProductFields): Promise<number> {
    this.recordPublishing(fields.slug);
    const answer = await answerOf(
      await this.request.post(PRODUCTS_PATH, {
        multipart: await this.publicationPartsOf(fields),
      }),
    );

    this.requirePublished(answer, `Publishing ${fields.title}`);

    return (answer.body as PublishedProductAnswer).publication.productId;
  }

  async changePricingAccepted(
    productId: number,
    pricing: ProductPricingRequest,
  ): Promise<void> {
    const answer = await answerOf(
      await this.request.post(`${PRODUCTS_PATH}/${productId}/prices`, {
        data: { idempotencyKey: randomUUID(), pricing },
      }),
    );

    this.requirePublished(answer, `Repricing product ${productId}`);
  }
}
