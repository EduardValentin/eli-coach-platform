import { ZipArchive } from "archiver";
import PDFDocument from "pdfkit";

type ZipEntry = { name: string; content: string; stored?: true };

type PdfOptions = { userPassword?: string };

type HandWrittenPdf = {
  mediaBox: string;
  resources: string;
  content: string;
  extraObjects: readonly Buffer[];
};

type OfficeOpenXmlPackage = {
  mainPart: string;
  mainContentType: string;
  extraParts?: readonly string[];
};

const OPEN_DOCUMENT_MIMETYPE = "mimetype";
const CONTENT_TYPES = "[Content_Types].xml";
const WORD_MAIN_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const EXCEL_MAIN_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const POWERPOINT_MAIN_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";
const WORD_97_CLASS_ID = "00020906-0000-0000-c000-000000000046";
const EXCEL_97_CLASS_ID = "00020820-0000-0000-c000-000000000046";
const POWERPOINT_97_CLASS_ID = "64818d10-4f9b-11cf-86ea-00aa00b929e8";
const WINDOWS_INSTALLER_CLASS_ID = "000c1084-0000-0000-c000-000000000046";
const CLASS_ID_OFFSET = 0x50;
const SECTOR_SIZE = 512;
const FAT_SECTOR = 0xfffffffd;
const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
const NO_STREAM = 0xffffffff;
const ROOT_STORAGE = 5;
const STREAM = 2;
const DIRECTORY_ENTRY_LENGTH = 128;

export async function pdfWithPages(
  pageCount: number,
  options: PdfOptions = {},
): Promise<Buffer> {
  const document = new PDFDocument({ autoFirstPage: false, ...options });
  const chunks: Buffer[] = [];
  document.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (let page = 1; page <= pageCount; page++) {
    document.addPage({ size: "A4" });
    document.font("Helvetica").fontSize(24).text(`Page ${page}`);
  }

  return new Promise((resolve) => {
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.end();
  });
}

export async function passwordProtectedPdf(): Promise<Buffer> {
  return pdfWithPages(1, { userPassword: "secret" });
}

export async function truncatedPdf(): Promise<Buffer> {
  const whole = await pdfWithPages(2);

  return whole.subarray(0, Math.floor(whole.byteLength / 2));
}

export function japaneseTextPdf(): Buffer {
  return handWrittenPdf({
    mediaBox: "[0 0 595 842]",
    resources: "<< /Font << /F1 5 0 R >> >>",
    content: "BT /F1 32 Tf 72 700 Td <65E5672C8A9E> Tj ET",
    extraObjects: [
      Buffer.from(
        "<< /Type /Font /Subtype /Type0 /BaseFont /KozMinPr6N-Regular /Encoding /UniJIS-UCS2-H /DescendantFonts [6 0 R] >>",
      ),
      Buffer.from(
        "<< /Type /Font /Subtype /CIDFontType0 /BaseFont /KozMinPr6N-Regular /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 6 >> /FontDescriptor 7 0 R >>",
      ),
      Buffer.from(
        "<< /Type /FontDescriptor /FontName /KozMinPr6N-Regular /Flags 4 /FontBBox [0 -120 1000 880] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>",
      ),
    ],
  });
}

export function wordDocument(): Promise<Buffer> {
  return officeOpenXml({
    mainPart: "word/document.xml",
    mainContentType: WORD_MAIN_CONTENT_TYPE,
  });
}

export function macroProjectWordDocument(): Promise<Buffer> {
  return officeOpenXml({
    mainPart: "word/document.xml",
    mainContentType: WORD_MAIN_CONTENT_TYPE,
    extraParts: ["word/vbaProject.bin"],
  });
}

export function excelWorkbook(): Promise<Buffer> {
  return officeOpenXml({
    mainPart: "xl/workbook.xml",
    mainContentType: EXCEL_MAIN_CONTENT_TYPE,
  });
}

export function powerPointPresentation(): Promise<Buffer> {
  return officeOpenXml({
    mainPart: "ppt/presentation.xml",
    mainContentType: POWERPOINT_MAIN_CONTENT_TYPE,
  });
}

export function openDocumentText(): Promise<Buffer> {
  return openDocument("application/vnd.oasis.opendocument.text");
}

export function openDocumentSpreadsheet(): Promise<Buffer> {
  return openDocument("application/vnd.oasis.opendocument.spreadsheet");
}

export function oldWordDocument(): Buffer {
  return compoundFileWithStream({
    streamName: "WordDocument",
    classId: WORD_97_CLASS_ID,
  });
}

export function oldExcelWorkbook(): Buffer {
  return compoundFileWithStream({
    streamName: "Workbook",
    classId: EXCEL_97_CLASS_ID,
  });
}

export function oldPowerPointPresentation(): Buffer {
  return compoundFileWithStream({
    streamName: "PowerPoint Document",
    classId: POWERPOINT_97_CLASS_ID,
  });
}

export function windowsInstaller(): Buffer {
  return compoundFileWithStream({
    streamName: "SummaryInformation",
    classId: WINDOWS_INSTALLER_CLASS_ID,
  });
}

export function windowsProgram(): Buffer {
  return Buffer.concat([Buffer.from("MZ"), Buffer.alloc(254, 0x90)]);
}

export function plainText(): Buffer {
  return Buffer.from("A meal plan written as plain text.\n");
}

export function paddedPdfOfLength(byteLength: number): Buffer {
  const bytes = Buffer.alloc(byteLength);
  pdfHeader().copy(bytes);

  return bytes;
}

function pdfHeader(): Buffer {
  return Buffer.from("%PDF-1.7\n");
}

function handWrittenPdf(pdf: HandWrittenPdf): Buffer {
  const objects: Buffer[] = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox ${pdf.mediaBox} /Resources ${pdf.resources} /Contents 4 0 R >>`,
    ),
    Buffer.from(
      `<< /Length ${Buffer.byteLength(pdf.content)} >>\nstream\n${pdf.content}\nendstream`,
    ),
    ...pdf.extraObjects,
  ];
  const header = pdfHeader();
  const chunks: Buffer[] = [header];
  const offsets: number[] = [];
  let length = header.byteLength;

  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const chunk = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`),
      object,
      Buffer.from("\nendobj\n"),
    ]);
    chunks.push(chunk);
    length += chunk.byteLength;
  }

  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(length),
    "%%EOF",
    "",
  ].join("\n");

  return Buffer.concat([...chunks, Buffer.from(xref)]);
}

function openDocument(mimetype: string): Promise<Buffer> {
  return zipOf([
    { name: OPEN_DOCUMENT_MIMETYPE, content: mimetype, stored: true },
    { name: "content.xml", content: "<office:document-content/>" },
  ]);
}

function officeOpenXml(document: OfficeOpenXmlPackage): Promise<Buffer> {
  const parts = [document.mainPart, ...(document.extraParts ?? [])];

  return zipOf([
    {
      name: CONTENT_TYPES,
      content: `<Types><Override PartName="/${document.mainPart}" ContentType="${document.mainContentType}"/></Types>`,
    },
    ...parts.map((name) => ({ name, content: "<part/>" })),
  ]);
}

function zipOf(entries: readonly ZipEntry[]): Promise<Buffer> {
  const archive = new ZipArchive();
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    for (const entry of entries) {
      archive.append(entry.content, {
        name: entry.name,
        store: entry.stored ?? false,
      });
    }

    void archive.finalize();
  });
}

function compoundFileWithStream({
  streamName,
  classId,
}: {
  streamName: string;
  classId: string;
}): Buffer {
  const bytes = Buffer.alloc(SECTOR_SIZE * 3, 0);
  const fatSector = 0;
  const directorySector = 1;
  const sectorOffset = (sector: number) => (sector + 1) * SECTOR_SIZE;

  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(bytes, 0);
  bytes.writeUInt16LE(0x3e, 0x18);
  bytes.writeUInt16LE(3, 0x1a);
  bytes.writeUInt16LE(0xfffe, 0x1c);
  bytes.writeUInt16LE(9, 0x1e);
  bytes.writeUInt16LE(6, 0x20);
  bytes.writeUInt32LE(1, 0x2c);
  bytes.writeUInt32LE(directorySector, 0x30);
  bytes.writeUInt32LE(4096, 0x38);
  bytes.writeUInt32LE(END_OF_CHAIN, 0x3c);
  bytes.writeUInt32LE(END_OF_CHAIN, 0x44);

  for (let slot = 0; slot < 109; slot++) {
    bytes.writeUInt32LE(slot === 0 ? fatSector : FREE_SECTOR, 0x4c + slot * 4);
  }

  const fat = sectorOffset(fatSector);
  for (let entry = 0; entry < SECTOR_SIZE / 4; entry++) {
    bytes.writeUInt32LE(FREE_SECTOR, fat + entry * 4);
  }
  bytes.writeUInt32LE(FAT_SECTOR, fat + fatSector * 4);
  bytes.writeUInt32LE(END_OF_CHAIN, fat + directorySector * 4);

  const directory = sectorOffset(directorySector);
  writeDirectoryEntry(bytes, directory, {
    name: "Root Entry",
    type: ROOT_STORAGE,
    child: 1,
  });
  classIdBytes(classId).copy(bytes, directory + CLASS_ID_OFFSET);
  writeDirectoryEntry(bytes, directory + DIRECTORY_ENTRY_LENGTH, {
    name: streamName,
    type: STREAM,
    child: NO_STREAM,
  });
  for (let index = 2; index < SECTOR_SIZE / DIRECTORY_ENTRY_LENGTH; index++) {
    writeDirectoryEntry(bytes, directory + index * DIRECTORY_ENTRY_LENGTH, {
      name: "",
      type: 0,
      child: NO_STREAM,
    });
  }

  return bytes;
}

function writeDirectoryEntry(
  bytes: Buffer,
  offset: number,
  entry: { name: string; type: number; child: number },
): void {
  bytes.write(entry.name, offset, "utf16le");
  bytes.writeUInt16LE(
    entry.name ? (entry.name.length + 1) * 2 : 0,
    offset + 0x40,
  );
  bytes.writeUInt8(entry.type, offset + 0x42);
  bytes.writeUInt32LE(NO_STREAM, offset + 0x44);
  bytes.writeUInt32LE(NO_STREAM, offset + 0x48);
  bytes.writeUInt32LE(entry.child, offset + 0x4c);
}

function classIdBytes(classId: string): Buffer {
  const [data1, data2, data3, data4, data5] = classId.split("-");
  const bytes = Buffer.alloc(16);

  bytes.writeUInt32LE(Number.parseInt(data1, 16), 0);
  bytes.writeUInt16LE(Number.parseInt(data2, 16), 4);
  bytes.writeUInt16LE(Number.parseInt(data3, 16), 6);
  Buffer.from(`${data4}${data5}`, "hex").copy(bytes, 8);

  return bytes;
}
