import { ByteView } from "./byte-view";
import { rootStreamNames } from "./compound-file-directory";
import type { ResourceFileFormat } from "./resource-file-kind";
import {
  OPEN_DOCUMENT_MIMETYPE_ENTRY,
  openDocumentMimetype,
  zipEntryNames,
} from "./zip-central-directory";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const COMPOUND_FILE_SIGNATURE = [
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
];

const RIFF_HEADER = {
  tag: "RIFF",
  length: 12,
  offsetOf: { tag: 0, formType: 8 },
} as const;
const WEBP_FORM_TYPE = "WEBP";

const OPEN_DOCUMENT_FORMATS: Readonly<Record<string, ResourceFileFormat>> = {
  "application/vnd.oasis.opendocument.text": "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
};
const OFFICE_OPEN_XML_CONTENT_TYPES = "[Content_Types].xml";
const OFFICE_OPEN_XML_WORD_PART = "word/document.xml";
const OFFICE_OPEN_XML_EXCEL_PART = "xl/workbook.xml";
const OFFICE_OPEN_XML_MACRO_PARTS = [
  "word/vbaProject.bin",
  "xl/vbaProject.bin",
];

const WORD_STREAM = "WordDocument";
const EXCEL_STREAMS = ["Workbook", "Book"];
const POWERPOINT_STREAM = "PowerPoint Document";

export function detectResourceFileFormat(
  bytes: Uint8Array,
): ResourceFileFormat | null {
  const file = new ByteView(bytes);

  if (file.startsWith(PDF_SIGNATURE)) return "pdf";
  if (file.startsWith(JPEG_SIGNATURE)) return "jpeg";
  if (file.startsWith(PNG_SIGNATURE)) return "png";
  if (isWebp(file)) return "webp";
  if (file.startsWith(ZIP_SIGNATURE)) return zipFormat(file);
  if (file.startsWith(COMPOUND_FILE_SIGNATURE)) return compoundFileFormat(file);

  return null;
}

function isWebp(file: ByteView): boolean {
  return (
    file.length >= RIFF_HEADER.length &&
    file.ascii(RIFF_HEADER.offsetOf.tag, RIFF_HEADER.tag.length) ===
      RIFF_HEADER.tag &&
    file.ascii(RIFF_HEADER.offsetOf.formType, WEBP_FORM_TYPE.length) ===
      WEBP_FORM_TYPE
  );
}

function zipFormat(file: ByteView): ResourceFileFormat | null {
  const names = zipEntryNames(file);

  if (!names) return null;
  if (names[0] === OPEN_DOCUMENT_MIMETYPE_ENTRY) {
    return openDocumentFormat(openDocumentMimetype(file));
  }

  return officeOpenXmlFormat(new Set(names));
}

function openDocumentFormat(
  mimetype: string | null,
): ResourceFileFormat | null {
  if (mimetype === null) return null;

  return OPEN_DOCUMENT_FORMATS[mimetype] ?? null;
}

function officeOpenXmlFormat(
  names: ReadonlySet<string>,
): ResourceFileFormat | null {
  if (!names.has(OFFICE_OPEN_XML_CONTENT_TYPES)) return null;
  if (OFFICE_OPEN_XML_MACRO_PARTS.some((part) => names.has(part))) return null;

  const word = names.has(OFFICE_OPEN_XML_WORD_PART);
  const excel = names.has(OFFICE_OPEN_XML_EXCEL_PART);

  if (word && !excel) return "docx";
  if (excel && !word) return "xlsx";

  return null;
}

function compoundFileFormat(file: ByteView): ResourceFileFormat | null {
  const streams = rootStreamNames(file);

  return streams ? oldOfficeFormat(streams) : null;
}

function oldOfficeFormat(
  streamNames: readonly string[],
): ResourceFileFormat | null {
  const names = new Set(streamNames);

  if (names.has(POWERPOINT_STREAM)) return null;

  const word = names.has(WORD_STREAM);
  const excel = EXCEL_STREAMS.some((name) => names.has(name));

  if (word && !excel) return "doc";
  if (excel && !word) return "xls";

  return null;
}
