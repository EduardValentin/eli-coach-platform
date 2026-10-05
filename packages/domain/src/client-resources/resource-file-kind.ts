export const RESOURCE_FILE_KINDS = ["pdf", "image", "word", "excel"] as const;

export type ResourceFileKind = (typeof RESOURCE_FILE_KINDS)[number];

const FORMAT_FACTS = {
  pdf: { kind: "pdf", mimeType: "application/pdf" },
  jpeg: { kind: "image", mimeType: "image/jpeg" },
  png: { kind: "image", mimeType: "image/png" },
  webp: { kind: "image", mimeType: "image/webp" },
  docx: {
    kind: "word",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  doc: { kind: "word", mimeType: "application/msword" },
  odt: { kind: "word", mimeType: "application/vnd.oasis.opendocument.text" },
  xlsx: {
    kind: "excel",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  xls: { kind: "excel", mimeType: "application/vnd.ms-excel" },
  ods: {
    kind: "excel",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
  },
} as const satisfies Record<
  string,
  { kind: ResourceFileKind; mimeType: string }
>;

export type ResourceFileFormat = keyof typeof FORMAT_FACTS;

export const RESOURCE_FILE_FORMATS = Object.keys(
  FORMAT_FACTS,
) as readonly ResourceFileFormat[];

const PAGE_PREVIEWED_KINDS: readonly ResourceFileKind[] = ["pdf", "image"];

export function resourceFileKindOf(
  format: ResourceFileFormat,
): ResourceFileKind {
  return FORMAT_FACTS[format].kind;
}

export function resourceFileMimeTypeOf(format: ResourceFileFormat): string {
  return FORMAT_FACTS[format].mimeType;
}

export function hasPagePreview(kind: ResourceFileKind): boolean {
  return PAGE_PREVIEWED_KINDS.includes(kind);
}
