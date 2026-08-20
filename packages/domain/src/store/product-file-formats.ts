export type StoreFileFormat = {
  extension: string;
  mimeType: string;
};

export type DownloadFormatResolution =
  | { status: "resolved"; format: StoreFileFormat }
  | { status: "unsupported_extension" }
  | { status: "content_mismatch" };

export type CoverFormatResolution =
  | { status: "resolved"; format: StoreFileFormat }
  | { status: "unsupported_content" };

export type ResolveDownloadFormatCommand = {
  bytes: Uint8Array;
  customerFilename: string;
};

/**
 * The container family a download's bytes must belong to. EPUB, XLSX, XLSM and
 * ZIP share one family because they are all ZIP containers: telling them apart
 * would mean reading the archive's directory, and these files are stored and
 * delivered as opaque bytes precisely so the application never interprets them.
 * The signature therefore proves the container, and the customer filename —
 * restricted to the allowlist below — selects which member of the family it is.
 */
type DownloadContentFamily = "ole" | "pdf" | "text" | "zip";

type DownloadFormatDefinition = StoreFileFormat & {
  family: DownloadContentFamily;
};

const DOWNLOAD_FORMATS = [
  { extension: "pdf", mimeType: "application/pdf", family: "pdf" },
  { extension: "epub", mimeType: "application/epub+zip", family: "zip" },
  { extension: "zip", mimeType: "application/zip", family: "zip" },
  {
    extension: "xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    family: "zip",
  },
  {
    extension: "xlsm",
    mimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
    family: "zip",
  },
  { extension: "xls", mimeType: "application/vnd.ms-excel", family: "ole" },
  { extension: "md", mimeType: "text/markdown", family: "text" },
  { extension: "csv", mimeType: "text/csv", family: "text" },
] as const satisfies readonly DownloadFormatDefinition[];

const COVER_FORMATS = [
  { extension: "jpg", mimeType: "image/jpeg" },
  { extension: "png", mimeType: "image/png" },
  { extension: "webp", mimeType: "image/webp" },
  { extension: "avif", mimeType: "image/avif" },
] as const satisfies readonly StoreFileFormat[];

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const OLE_SIGNATURE = [
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
] as const;
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04],
  [0x50, 0x4b, 0x05, 0x06],
  [0x50, 0x4b, 0x07, 0x08],
] as const;
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
] as const;
const AVIF_BRANDS = ["avif", "avis"] as const;
const ALLOWED_TEXT_CONTROL_CODES = [0x09, 0x0a, 0x0d] as const;

export const STORE_DOWNLOAD_EXTENSIONS = DOWNLOAD_FORMATS.map(
  (format) => format.extension,
);
export const STORE_COVER_EXTENSIONS = COVER_FORMATS.map(
  (format) => format.extension,
);

export function resolveDownloadFormat(
  command: ResolveDownloadFormatCommand,
): DownloadFormatResolution {
  const extension = readFilenameExtension(command.customerFilename);
  const definition = DOWNLOAD_FORMATS.find(
    (format) => format.extension === extension,
  );

  if (!definition) {
    return { status: "unsupported_extension" };
  }

  if (!matchesDownloadFamily(command.bytes, definition.family)) {
    return { status: "content_mismatch" };
  }

  return {
    status: "resolved",
    format: { extension: definition.extension, mimeType: definition.mimeType },
  };
}

export function resolveCoverFormat(bytes: Uint8Array): CoverFormatResolution {
  const extension = readCoverExtension(bytes);
  const definition = COVER_FORMATS.find(
    (format) => format.extension === extension,
  );

  return definition
    ? { status: "resolved", format: { ...definition } }
    : { status: "unsupported_content" };
}

function readCoverExtension(bytes: Uint8Array): string | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) {
    return "jpg";
  }

  if (startsWith(bytes, PNG_SIGNATURE)) {
    return "png";
  }

  if (hasAsciiAt(bytes, 0, "RIFF") && hasAsciiAt(bytes, 8, "WEBP")) {
    return "webp";
  }

  if (
    hasAsciiAt(bytes, 4, "ftyp") &&
    AVIF_BRANDS.some((brand) => hasAsciiAt(bytes, 8, brand))
  ) {
    return "avif";
  }

  return null;
}

function matchesDownloadFamily(
  bytes: Uint8Array,
  family: DownloadContentFamily,
): boolean {
  if (bytes.byteLength === 0) {
    return false;
  }

  if (family === "pdf") {
    return startsWith(bytes, PDF_SIGNATURE);
  }

  if (family === "ole") {
    return startsWith(bytes, OLE_SIGNATURE);
  }

  if (family === "zip") {
    return ZIP_SIGNATURES.some((signature) => startsWith(bytes, signature));
  }

  return isDeliverableText(bytes);
}

function isDeliverableText(bytes: Uint8Array): boolean {
  const hasDisallowedControlCode = bytes.some(
    (byte) =>
      byte < 0x20 &&
      !ALLOWED_TEXT_CONTROL_CODES.some((allowed) => allowed === byte),
  );

  if (hasDisallowedControlCode) {
    return false;
  }

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);

    return true;
  } catch {
    return false;
  }
}

function readFilenameExtension(customerFilename: string): string | null {
  const separatorIndex = customerFilename.lastIndexOf(".");

  if (separatorIndex <= 0 || separatorIndex === customerFilename.length - 1) {
    return null;
  }

  return customerFilename.slice(separatorIndex + 1).toLowerCase();
}

function startsWith(
  bytes: Uint8Array,
  signature: readonly number[],
): boolean {
  return (
    bytes.byteLength >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function hasAsciiAt(
  bytes: Uint8Array,
  offset: number,
  text: string,
): boolean {
  return (
    bytes.byteLength >= offset + text.length &&
    [...text].every(
      (character, index) => bytes[offset + index] === character.charCodeAt(0),
    )
  );
}
