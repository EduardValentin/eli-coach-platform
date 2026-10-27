import type { ProductAsset } from "../product";

export type DownloadGrantItem = {
  productSlug: string;
  productTitle: string;
  productVersionId: number;
  assets: readonly ProductAsset[];
};

export type GrantDelivery =
  | { kind: "single"; asset: ProductAsset }
  | { kind: "bundle"; assets: readonly ProductAsset[] }
  | { kind: "empty" };

type DownloadGrantProps = {
  id: number;
  status: "active" | "revoked";
  expiresAt: Date;
  items: readonly DownloadGrantItem[];
};

export class DownloadGrant {
  readonly id: number;
  readonly status: "active" | "revoked";
  readonly expiresAt: Date;
  readonly items: readonly DownloadGrantItem[];

  private constructor(props: DownloadGrantProps) {
    this.id = props.id;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.items = props.items;
  }

  static reconstitute(props: DownloadGrantProps): DownloadGrant {
    return new DownloadGrant(props);
  }

  isActive(now: Date): boolean {
    return this.status === "active" && this.expiresAt.getTime() > now.getTime();
  }

  delivery(): GrantDelivery {
    if (
      this.items.length === 0 ||
      this.items.some((item) => item.assets.length === 0)
    ) {
      return { kind: "empty" };
    }

    const assets = this.items.flatMap((item) => item.assets);

    if (assets.length === 1) {
      return { kind: "single", asset: assets[0]! };
    }

    return { kind: "bundle", assets };
  }
}
