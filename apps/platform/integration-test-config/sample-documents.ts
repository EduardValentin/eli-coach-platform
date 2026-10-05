import { ZipArchive } from "archiver";
import PDFDocument from "pdfkit";

type ZipEntry = { name: string; content: string; stored?: true };

type PdfOptions = { userPassword?: string };

const OPEN_DOCUMENT_MIMETYPE = "mimetype";
const CONTENT_TYPES = "[Content_Types].xml";
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

export function wordDocument(): Promise<Buffer> {
  return zipOf([
    { name: CONTENT_TYPES, content: "<Types/>" },
    { name: "word/document.xml", content: "<w:document/>" },
  ]);
}

export function excelWorkbook(): Promise<Buffer> {
  return zipOf([
    { name: CONTENT_TYPES, content: "<Types/>" },
    { name: "xl/workbook.xml", content: "<workbook/>" },
  ]);
}

export function powerPointPresentation(): Promise<Buffer> {
  return zipOf([
    { name: CONTENT_TYPES, content: "<Types/>" },
    { name: "ppt/presentation.xml", content: "<p:presentation/>" },
  ]);
}

export function openDocumentText(): Promise<Buffer> {
  return openDocument("application/vnd.oasis.opendocument.text");
}

export function openDocumentSpreadsheet(): Promise<Buffer> {
  return openDocument("application/vnd.oasis.opendocument.spreadsheet");
}

export function oldWordDocument(): Buffer {
  return compoundFileWithStream("WordDocument");
}

export function oldExcelWorkbook(): Buffer {
  return compoundFileWithStream("Workbook");
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

function openDocument(mimetype: string): Promise<Buffer> {
  return zipOf([
    { name: OPEN_DOCUMENT_MIMETYPE, content: mimetype, stored: true },
    { name: "content.xml", content: "<office:document-content/>" },
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

function compoundFileWithStream(streamName: string): Buffer {
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
