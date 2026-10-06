import type {
  ResourceImagePages,
  ResourceImageRendering,
  ResourceRenditions,
} from "@eli-coach-platform/domain/client-resources";
import sharp, { type Sharp } from "sharp";

import { openAcceptedImage } from "./accepted-image.server";

const REFUSED: ResourceImageRendering = { status: "refused" };

class SharpResourceImagePages implements ResourceImagePages {
  constructor(private readonly renditions: ResourceRenditions) {}

  async render(bytes: Uint8Array): Promise<ResourceImageRendering> {
    try {
      return await this.renderAcceptedImage(bytes);
    } catch {
      return REFUSED;
    }
  }

  private async renderAcceptedImage(
    bytes: Uint8Array,
  ): Promise<ResourceImageRendering> {
    const image = await openAcceptedImage(bytes);

    if (image === null) {
      return REFUSED;
    }

    const page = await this.bounded(
      image.autoOrient(),
      this.renditions.page.longEdge,
    );
    const thumbnail = await this.bounded(
      sharp(page),
      this.renditions.thumbnail.longEdge,
    );

    return { status: "rendered", page, thumbnail };
  }

  private async bounded(image: Sharp, longEdge: number): Promise<Uint8Array> {
    return image
      .resize({
        width: longEdge,
        height: longEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(this.renditions.format, { quality: this.renditions.quality })
      .toBuffer();
  }
}

export function createResourceImagePages(
  renditions: ResourceRenditions,
): ResourceImagePages {
  return new SharpResourceImagePages(renditions);
}
