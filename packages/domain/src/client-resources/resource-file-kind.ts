export const RESOURCE_FILE_KINDS = ["pdf", "image", "word", "excel"] as const;

export type ResourceFileKind = (typeof RESOURCE_FILE_KINDS)[number];

type FormatFacts = {
  kind: ResourceFileKind;
  mimeType: string;
  extensions: readonly [string, ...string[]];
};

const FORMAT_FACTS = {
  pdf: { kind: "pdf", mimeType: "application/pdf", extensions: ["pdf"] },
  doc: { kind: "word", mimeType: "application/msword", extensions: ["doc"] },
  docx: {
    kind: "word",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extensions: ["docx"],
  },
  odt: {
    kind: "word",
    mimeType: "application/vnd.oasis.opendocument.text",
    extensions: ["odt"],
  },
  xls: {
    kind: "excel",
    mimeType: "application/vnd.ms-excel",
    extensions: ["xls"],
  },
  xlsx: {
    kind: "excel",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extensions: ["xlsx"],
  },
  ods: {
    kind: "excel",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    extensions: ["ods"],
  },
  jpeg: {
    kind: "image",
    mimeType: "image/jpeg",
    extensions: ["jpg", "jpeg"],
  },
  png: { kind: "image", mimeType: "image/png", extensions: ["png"] },
  webp: { kind: "image", mimeType: "image/webp", extensions: ["webp"] },
} as const satisfies Record<string, FormatFacts>;

export type ResourceFileFormat = keyof typeof FORMAT_FACTS;

export const RESOURCE_FILE_FORMATS = Object.keys(
  FORMAT_FACTS,
) as readonly ResourceFileFormat[];

export const RESOURCE_FILE_EXTENSIONS: readonly string[] =
  RESOURCE_FILE_FORMATS.flatMap((format) => FORMAT_FACTS[format].extensions);

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

export function resourceFileKindOfExtension(
  extension: string,
): ResourceFileKind | null {
  const format = RESOURCE_FILE_FORMATS.find((candidate) =>
    resourceFileExtensionsOf(candidate).includes(extension.toLowerCase()),
  );

  return format ? resourceFileKindOf(format) : null;
}

export function resourceFileExtensionsOf(
  format: ResourceFileFormat,
): readonly [string, ...string[]] {
  return FORMAT_FACTS[format].extensions;
}
