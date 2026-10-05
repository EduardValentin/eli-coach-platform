import type { ResourceFileFormat } from "./resource-file-kind";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const COMPOUND_FILE_SIGNATURE = [
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
];

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const END_OF_CENTRAL_DIRECTORY_LENGTH = 22;
const MAX_ZIP_COMMENT_LENGTH = 0xffff;
const CENTRAL_DIRECTORY_ENTRY_SIGNATURE = 0x02014b50;
const CENTRAL_DIRECTORY_ENTRY_LENGTH = 46;
const LOCAL_FILE_HEADER_LENGTH = 30;
const MAX_ZIP_ENTRIES = 4096;
const STORED = 0;

const OPEN_DOCUMENT_MIMETYPE_ENTRY = "mimetype";
const MAX_OPEN_DOCUMENT_MIMETYPE_LENGTH = 128;
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

const COMPOUND_FILE_GEOMETRIES = [
  { majorVersion: 3, sectorShift: 9 },
  { majorVersion: 4, sectorShift: 12 },
];
const COMPOUND_FILE_BYTE_ORDER = 0xfffe;
const HEADER_ALLOCATION_TABLE_ENTRIES = 109;
const HEADER_ALLOCATION_TABLE_OFFSET = 0x4c;
const END_OF_CHAIN = 0xfffffffe;
const NO_ENTRY = 0xffffffff;
const DIRECTORY_ENTRY_LENGTH = 128;
const DIRECTORY_NAME_LENGTH = 64;
const ROOT_STORAGE = 5;
const STREAM = 2;
const MAX_ROOT_ENTRIES = 4096;
const WORD_STREAM = "WordDocument";
const EXCEL_STREAMS = ["Workbook", "Book"];
const POWERPOINT_STREAM = "PowerPoint Document";

class OutsideTheFile extends Error {}

class ByteView {
  private readonly view: DataView;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  get length(): number {
    return this.bytes.byteLength;
  }

  u8(offset: number): number {
    this.require(offset, 1);
    return this.view.getUint8(offset);
  }

  u16(offset: number): number {
    this.require(offset, 2);
    return this.view.getUint16(offset, true);
  }

  u32(offset: number): number {
    this.require(offset, 4);
    return this.view.getUint32(offset, true);
  }

  holds(signature: readonly number[], offset: number): boolean {
    return (
      this.covers(offset, signature.length) &&
      signature.every((value, index) => this.bytes[offset + index] === value)
    );
  }

  ascii(offset: number, length: number): string {
    this.require(offset, length);
    return Array.from(this.bytes.subarray(offset, offset + length), (code) =>
      String.fromCharCode(code),
    ).join("");
  }

  utf16(offset: number, codeUnits: number): string {
    this.require(offset, codeUnits * 2);
    return Array.from({ length: codeUnits }, (_, index) =>
      String.fromCharCode(this.view.getUint16(offset + index * 2, true)),
    ).join("");
  }

  private covers(offset: number, length: number): boolean {
    return (
      Number.isSafeInteger(offset) &&
      Number.isSafeInteger(length) &&
      offset >= 0 &&
      length >= 0 &&
      offset + length <= this.bytes.byteLength
    );
  }

  private require(offset: number, length: number): void {
    if (!this.covers(offset, length)) throw new OutsideTheFile();
  }
}

export function detectResourceFileFormat(
  bytes: Uint8Array,
): ResourceFileFormat | null {
  try {
    return formatOf(new ByteView(bytes));
  } catch (error) {
    if (error instanceof OutsideTheFile) return null;
    throw error;
  }
}

function formatOf(file: ByteView): ResourceFileFormat | null {
  if (file.holds(PDF_SIGNATURE, 0)) return "pdf";
  if (file.holds(JPEG_SIGNATURE, 0)) return "jpeg";
  if (file.holds(PNG_SIGNATURE, 0)) return "png";
  if (isWebp(file)) return "webp";
  if (file.holds(ZIP_SIGNATURE, 0)) return zipFormat(file);
  if (file.holds(COMPOUND_FILE_SIGNATURE, 0)) return compoundFileFormat(file);

  return null;
}

function isWebp(file: ByteView): boolean {
  return (
    file.length >= 12 &&
    file.ascii(0, 4) === "RIFF" &&
    file.ascii(8, 4) === "WEBP"
  );
}

type ZipEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function zipFormat(file: ByteView): ResourceFileFormat | null {
  const entries = zipEntries(file);

  if (!entries) return null;
  if (entries[0]?.name === OPEN_DOCUMENT_MIMETYPE_ENTRY) {
    return openDocumentFormat(file, entries[0]);
  }

  return officeOpenXmlFormat(new Set(entries.map((entry) => entry.name)));
}

function zipEntries(file: ByteView): ZipEntry[] | null {
  const end = endOfCentralDirectory(file);

  if (end === null) return null;

  const entryCount = file.u16(end + 10);
  const directoryLength = file.u32(end + 12);
  const directoryStart = file.u32(end + 16);
  const directoryEnd = directoryStart + directoryLength;

  if (entryCount > MAX_ZIP_ENTRIES || directoryEnd > end) return null;

  const entries: ZipEntry[] = [];
  let offset = directoryStart;

  for (let index = 0; index < entryCount; index++) {
    if (offset + CENTRAL_DIRECTORY_ENTRY_LENGTH > directoryEnd) return null;
    if (file.u32(offset) !== CENTRAL_DIRECTORY_ENTRY_SIGNATURE) return null;

    const nameLength = file.u16(offset + 28);
    const recordLength =
      CENTRAL_DIRECTORY_ENTRY_LENGTH +
      nameLength +
      file.u16(offset + 30) +
      file.u16(offset + 32);

    if (offset + recordLength > directoryEnd) return null;

    entries.push({
      name: file.ascii(offset + CENTRAL_DIRECTORY_ENTRY_LENGTH, nameLength),
      method: file.u16(offset + 10),
      compressedSize: file.u32(offset + 20),
      localHeaderOffset: file.u32(offset + 42),
    });
    offset += recordLength;
  }

  return entries;
}

function endOfCentralDirectory(file: ByteView): number | null {
  const last = file.length - END_OF_CENTRAL_DIRECTORY_LENGTH;
  const first = Math.max(0, last - MAX_ZIP_COMMENT_LENGTH);

  for (let offset = last; offset >= first; offset--) {
    if (file.u32(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset;
  }

  return null;
}

function openDocumentFormat(
  file: ByteView,
  mimetype: ZipEntry,
): ResourceFileFormat | null {
  if (
    mimetype.method !== STORED ||
    mimetype.localHeaderOffset !== 0 ||
    mimetype.compressedSize > MAX_OPEN_DOCUMENT_MIMETYPE_LENGTH
  ) {
    return null;
  }

  const contentStart = LOCAL_FILE_HEADER_LENGTH + file.u16(26) + file.u16(28);
  const declared = file.ascii(contentStart, mimetype.compressedSize);

  return OPEN_DOCUMENT_FORMATS[declared] ?? null;
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

type CompoundFileLayout = {
  sectorSize: number;
  sectorCount: number;
  allocationSectorCount: number;
  firstDirectorySector: number;
  firstExtensionSector: number;
};

type DirectoryEntry = {
  name: string;
  type: number;
  leftSibling: number;
  rightSibling: number;
  child: number;
};

function compoundFileFormat(file: ByteView): ResourceFileFormat | null {
  const layout = compoundFileLayout(file);

  if (!layout) return null;

  const allocationSectors = allocationTableSectors(file, layout);

  if (!allocationSectors) return null;

  const directory = new CompoundDirectory(file, layout, allocationSectors);
  const streams = directory.rootStreamNames();

  return streams ? oldOfficeFormat(streams) : null;
}

function compoundFileLayout(file: ByteView): CompoundFileLayout | null {
  const majorVersion = file.u16(0x1a);
  const sectorShift = file.u16(0x1e);
  const knownGeometry = COMPOUND_FILE_GEOMETRIES.some(
    (geometry) =>
      geometry.majorVersion === majorVersion &&
      geometry.sectorShift === sectorShift,
  );

  if (!knownGeometry || file.u16(0x1c) !== COMPOUND_FILE_BYTE_ORDER) {
    return null;
  }

  const sectorSize = 2 ** sectorShift;

  return {
    sectorSize,
    sectorCount: Math.max(
      0,
      Math.ceil((file.length - sectorSize) / sectorSize),
    ),
    allocationSectorCount: file.u32(0x2c),
    firstDirectorySector: file.u32(0x30),
    firstExtensionSector: file.u32(0x44),
  };
}

function allocationTableSectors(
  file: ByteView,
  layout: CompoundFileLayout,
): number[] | null {
  const wanted = layout.allocationSectorCount;

  if (wanted > layout.sectorCount) return null;

  const sectors: number[] = [];
  const headerEntries = Math.min(wanted, HEADER_ALLOCATION_TABLE_ENTRIES);

  for (let index = 0; index < headerEntries; index++) {
    sectors.push(file.u32(HEADER_ALLOCATION_TABLE_OFFSET + index * 4));
  }

  const entriesPerSector = layout.sectorSize / 4 - 1;
  const visited = new Set<number>();
  let extensionSector = layout.firstExtensionSector;

  while (sectors.length < wanted) {
    if (!isSector(layout, extensionSector) || visited.has(extensionSector)) {
      return null;
    }
    visited.add(extensionSector);

    const offset = sectorOffset(layout, extensionSector);
    const count = Math.min(entriesPerSector, wanted - sectors.length);

    for (let index = 0; index < count; index++) {
      sectors.push(file.u32(offset + index * 4));
    }
    extensionSector = file.u32(offset + entriesPerSector * 4);
  }

  return sectors.every((sector) => isSector(layout, sector)) ? sectors : null;
}

class CompoundDirectory {
  private readonly entriesPerSector: number;

  constructor(
    private readonly file: ByteView,
    private readonly layout: CompoundFileLayout,
    private readonly allocationSectors: readonly number[],
  ) {
    this.entriesPerSector = layout.sectorSize / DIRECTORY_ENTRY_LENGTH;
  }

  rootStreamNames(): string[] | null {
    const chain = this.directoryChain();
    const root = chain ? this.entry(chain, 0) : null;

    if (!chain || root?.type !== ROOT_STORAGE) return null;

    const names: string[] = [];
    const visited = new Set<number>();
    const pending = [root.child];

    while (pending.length > 0) {
      const index = pending.pop() ?? NO_ENTRY;

      if (index === NO_ENTRY) continue;
      if (visited.has(index) || visited.size >= MAX_ROOT_ENTRIES) return null;
      visited.add(index);

      const entry = this.entry(chain, index);

      if (!entry) return null;
      if (entry.type === STREAM) names.push(entry.name);
      pending.push(entry.leftSibling, entry.rightSibling);
    }

    return names;
  }

  private directoryChain(): number[] | null {
    const chain: number[] = [];
    const visited = new Set<number>();
    let sector = this.layout.firstDirectorySector;

    while (sector !== END_OF_CHAIN) {
      if (!isSector(this.layout, sector) || visited.has(sector)) return null;
      visited.add(sector);
      chain.push(sector);

      const next = this.nextSector(sector);

      if (next === null) return null;
      sector = next;
    }

    return chain;
  }

  private nextSector(sector: number): number | null {
    const entriesPerSector = this.layout.sectorSize / 4;
    const allocationSector =
      this.allocationSectors[Math.floor(sector / entriesPerSector)];

    if (allocationSector === undefined) return null;

    return this.file.u32(
      sectorOffset(this.layout, allocationSector) +
        (sector % entriesPerSector) * 4,
    );
  }

  private entry(
    chain: readonly number[],
    index: number,
  ): DirectoryEntry | null {
    const sector = chain[Math.floor(index / this.entriesPerSector)];

    if (sector === undefined) return null;

    const offset =
      sectorOffset(this.layout, sector) +
      (index % this.entriesPerSector) * DIRECTORY_ENTRY_LENGTH;

    return {
      name: this.entryName(offset),
      type: this.file.u8(offset + 0x42),
      leftSibling: this.file.u32(offset + 0x44),
      rightSibling: this.file.u32(offset + 0x48),
      child: this.file.u32(offset + 0x4c),
    };
  }

  private entryName(offset: number): string {
    const byteLength = this.file.u16(offset + 0x40);

    if (
      byteLength < 2 ||
      byteLength > DIRECTORY_NAME_LENGTH ||
      byteLength % 2 !== 0
    ) {
      return "";
    }

    return this.file.utf16(offset, byteLength / 2 - 1);
  }
}

function isSector(layout: CompoundFileLayout, sector: number): boolean {
  return sector < layout.sectorCount;
}

function sectorOffset(layout: CompoundFileLayout, sector: number): number {
  return (sector + 1) * layout.sectorSize;
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
