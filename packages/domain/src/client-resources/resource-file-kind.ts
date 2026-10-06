export const RESOURCE_FILE_KINDS = ["pdf", "image", "word", "excel"] as const;

export type ResourceFileKind = (typeof RESOURCE_FILE_KINDS)[number];

type FormatFacts = {
  kind: ResourceFileKind;
  mimeType: string;
  extensions: readonly [string, ...string[]];
};

const FORMAT_FACTS = {
  pdf: { kind: "pdf", mimeType: "application/pdf", extensions: ["pdf"] },
  jpeg: {
    kind: "image",
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  png: { kind: "image", mimeType: "image/png", extensions: ["png"] },
  webp: { kind: "image", mimeType: "image/webp", extensions: ["webp"] },
  docx: {
    kind: "word",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
  },
  doc: { kind: "word", mimeType: "application/msword", extensions: ["doc"] },
  odt: {
    kind: "word",
    mimeType: "application/vnd.oasis.opendocument.text",
    extensions: ["odt"],
  },
  xlsx: {
    kind: "excel",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: ["xlsx"],
  },
  xls: {
    kind: "excel",
    mimeType: "application/vnd.ms-excel",
    extensions: ["xls"],
  },
  ods: {
    kind: "excel",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    extensions: ["ods"],
  },
} as const satisfies Record<string, FormatFacts>;

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

export function resourceFileExtensionsOf(
  format: ResourceFileFormat,
): readonly [string, ...string[]] {
  return FORMAT_FACTS[format].extensions;
}
