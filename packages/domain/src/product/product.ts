const STORE_COVER_MIME_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function isStoreCoverMimeType(
  value: string,
): value is (typeof STORE_COVER_MIME_TYPES)[number] {
  return STORE_COVER_MIME_TYPES.some((mimeType) => mimeType === value);
}

export type StoreTaxonomyValue = {
  slug: string;
  label: string;
  displayOrder: number;
};

export type ProductAsset = {
  assetKey: string;
  customerFilename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
};

export type PublishedProductVersion = {
  id: number;
  sequence: number;
  title: string;
  creatorName: string;
  cardSummary: string;
  detailDescription: string;
  includedItems: readonly string[];
  cover: {
    assetKey: string;
    alt: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  };
  assets: readonly ProductAsset[];
  types: readonly StoreTaxonomyValue[];
  goals: readonly StoreTaxonomyValue[];
  publishedAt: Date;
};

export type PublishedProductCover = ProductAsset & {
  alt: string;
};

type PublishedProductProps = {
  id: number;
  slug: string;
  displayOrder: number;
  version: PublishedProductVersion;
};

export class PublishedProduct {
  readonly id: number;
  readonly slug: string;
  readonly displayOrder: number;
  readonly version: PublishedProductVersion;

  private constructor(props: PublishedProductProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.displayOrder = props.displayOrder;
    this.version = props.version;
  }

  static reconstitute(props: PublishedProductProps): PublishedProduct {
    return new PublishedProduct(props);
  }

  deliveryResource(): { title: string; typeLabels: readonly string[] } {
    return {
      title: this.version.title,
      typeLabels: this.version.types.map((type) => type.label),
    };
  }
}

export type PinnedProductSelection = {
  productId: number;
  slug: string;
  pinnedVersionId: number;
};

export type LockedProductState = {
  productId: number;
  slug: string;
  lifecycleStatus: "archived" | "draft" | "published";
  currentVersionId: number | null;
};

export type PurchasabilityDecision =
  | { status: "purchasable" }
  | { status: "unavailable"; purchasableSlugs: readonly string[] };

type ProductProps = {
  id: number;
  slug: string;
  displayOrder: number;
  lifecycleStatus: "archived" | "draft" | "published";
  latestVersionSequence: number;
};

export class Product {
  readonly id: number;
  readonly slug: string;
  readonly displayOrder: number;
  readonly lifecycleStatus: "archived" | "draft" | "published";
  readonly latestVersionSequence: number;

  private constructor(props: ProductProps) {
    this.id = props.id;
    this.slug = props.slug;
    this.displayOrder = props.displayOrder;
    this.lifecycleStatus = props.lifecycleStatus;
    this.latestVersionSequence = props.latestVersionSequence;
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props);
  }

  static evaluatePurchasability(
    selections: readonly PinnedProductSelection[],
    lockedProducts: readonly LockedProductState[],
  ): PurchasabilityDecision {
    const lockedBySlug = new Map(
      lockedProducts.map((product) => [product.slug, product]),
    );
    const purchasableSlugs = selections
      .map((selection) => selection.slug)
      .filter((slug) => {
        const locked = lockedBySlug.get(slug);

        return (
          locked?.lifecycleStatus === "published" &&
          locked.currentVersionId !== null
        );
      });
    const everyPinnedVersionIsCurrent = selections.every((selection) => {
      const locked = lockedBySlug.get(selection.slug);

      return (
        locked?.productId === selection.productId &&
        locked.lifecycleStatus === "published" &&
        locked.currentVersionId === selection.pinnedVersionId
      );
    });

    return everyPinnedVersionIsCurrent
      ? { status: "purchasable" }
      : { status: "unavailable", purchasableSlugs };
  }

  canBeRevised(): boolean {
    return this.lifecycleStatus !== "archived";
  }

  nextVersionSequence(): number {
    return this.latestVersionSequence + 1;
  }
}
