import type {
  ResourceImagePages,
  ResourceImageRendering,
  ResourceRenditions,
} from "~/bounded-contexts/clients/client-resources/domain/client-resources";

import {
  fitRenderedImageInside,
  openAcceptedImage,
  type ImageEncoding,
} from "~/shared/images/sharp-renditions.server";

const REFUSED: ResourceImageRendering = { status: "refused" };

class SharpResourceImagePages implements ResourceImagePages {
  private readonly encoding: ImageEncoding;

  constructor(private readonly renditions: ResourceRenditions) {
    this.encoding = {
      format: renditions.format,
      quality: renditions.quality,
    };
  }

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

    const page = await image.fitInside(
      this.renditions.page.longEdge,
      this.encoding,
    );
    const thumbnail = await fitRenderedImageInside(
      page,
      this.renditions.thumbnail.longEdge,
      this.encoding,
    );

    return { status: "rendered", page, thumbnail };
  }
}

export function createResourceImagePages(
  renditions: ResourceRenditions,
): ResourceImagePages {
  return new SharpResourceImagePages(renditions);
}
