export type ResourceRenditions = {
  page: { longEdge: number };
  thumbnail: { longEdge: number };
  format: "webp";
};

export const RESOURCE_RENDITIONS: ResourceRenditions = {
  page: { longEdge: 1600 },
  thumbnail: { longEdge: 480 },
  format: "webp",
};

export const RESOURCE_RENDITION_MIME_TYPE =
  `image/${RESOURCE_RENDITIONS.format}` as const;
