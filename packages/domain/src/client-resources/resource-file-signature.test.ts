import { describe, expect, it } from "vitest";

import { detectResourceFileFormat } from "./resource-file-signature";

const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
const FAT_SECTOR = 0xfffffffd;
const DIFAT_SECTOR = 0xfffffffc;
const NO_STREAM = 0xffffffff;
const HEADER_DIFAT_ENTRIES = 109;

function ascii(text: string): Uint8Array {
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

function u16(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function u32(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const joined = new Uint8Array(
    parts.reduce((total, part) => total + part.byteLength, 0),
  );
  let offset = 0;

  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }

  return joined;
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  bytes.set(u32(value), offset);
}

type ZipEntry = { name: string; content?: string; deflated?: true };

function zipArchive(entries: readonly ZipEntry[]): Uint8Array {
  const localRecords: Uint8Array[] = [];
  const centralRecords: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = ascii(entry.name);
    const data = ascii(entry.content ?? "");
    const method = entry.deflated ? 8 : 0;
    const local = concat(
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(0),
      u32(data.byteLength),
      u32(data.byteLength),
      u16(name.byteLength),
      u16(0),
      name,
      data,
    );
    const central = concat(
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(0),
      u32(data.byteLength),
      u32(data.byteLength),
      u16(name.byteLength),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    );

    localRecords.push(local);
    centralRecords.push(central);
    offset += local.byteLength;
  }

  const directory = concat(...centralRecords);
  const end = concat(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(directory.byteLength),
    u32(offset),
    u16(0),
  );

  return concat(...localRecords, directory, end);
}

const OPEN_DOCUMENT_TEXT = "application/vnd.oasis.opendocument.text";
const OPEN_DOCUMENT_SPREADSHEET =
  "application/vnd.oasis.opendocument.spreadsheet";

const DOCX = zipArchive([
  { name: "[Content_Types].xml", deflated: true },
  { name: "_rels/.rels", deflated: true },
  { name: "word/document.xml", deflated: true },
  { name: "word/styles.xml", deflated: true },
]);
const XLSX = zipArchive([
  { name: "[Content_Types].xml", deflated: true },
  { name: "_rels/.rels", deflated: true },
  { name: "xl/workbook.xml", deflated: true },
  { name: "xl/worksheets/sheet1.xml", deflated: true },
]);
const ODT = zipArchive([
  { name: "mimetype", content: OPEN_DOCUMENT_TEXT },
  { name: "content.xml", deflated: true },
  { name: "META-INF/manifest.xml", deflated: true },
]);
const ODS = zipArchive([
  { name: "mimetype", content: OPEN_DOCUMENT_SPREADSHEET },
  { name: "content.xml", deflated: true },
]);

type CompoundEntry = { name: string; children?: readonly CompoundEntry[] };

type CompoundFileOptions = {
  sectorSize?: 512 | 4096;
  directorySector?: number;
};

type DirectoryRecord = {
  name: string;
  type: number;
  right: number;
  child: number;
};

function directoryRecords(
  rootChildren: readonly CompoundEntry[],
): DirectoryRecord[] {
  const records: DirectoryRecord[] = [
    { name: "Root Entry", type: 5, right: NO_STREAM, child: NO_STREAM },
  ];

  function place(entries: readonly CompoundEntry[]): number {
    const indices = entries.map((entry) => {
      records.push({
        name: entry.name,
        type: entry.children ? 1 : 2,
        right: NO_STREAM,
        child: NO_STREAM,
      });

      return records.length - 1;
    });

    entries.forEach((entry, position) => {
      const record = records[indices[position]];

      record.right = indices[position + 1] ?? NO_STREAM;
      if (entry.children) record.child = place(entry.children);
    });

    return indices[0] ?? NO_STREAM;
  }

  records[0].child = place(rootChildren);

  return records;
}

function compoundFile(
  rootChildren: readonly CompoundEntry[],
  options: CompoundFileOptions = {},
): Uint8Array {
  const sectorSize = options.sectorSize ?? 512;
  const entriesPerFatSector = sectorSize / 4;
  const recordsPerSector = sectorSize / 128;
  const records = directoryRecords(rootChildren);
  const directorySectorCount = Math.ceil(records.length / recordsPerSector);
  const directorySector = options.directorySector ?? 1;
  const sectorCount = directorySector + directorySectorCount;
  const fatSectorCount = Math.ceil(sectorCount / entriesPerFatSector);
  const difatSectorCount = Math.max(
    0,
    Math.ceil(
      (fatSectorCount - HEADER_DIFAT_ENTRIES) / (entriesPerFatSector - 1),
    ),
  );

  if (fatSectorCount + difatSectorCount > directorySector) {
    throw new Error("the directory overlaps the allocation tables");
  }

  const bytes = new Uint8Array(sectorSize * (sectorCount + 1));
  const sectorOffset = (sector: number) => (sector + 1) * sectorSize;
  const fat = new Array<number>(fatSectorCount * entriesPerFatSector).fill(
    FREE_SECTOR,
  );

  for (let sector = 0; sector < fatSectorCount; sector++) {
    fat[sector] = FAT_SECTOR;
  }
  for (let index = 0; index < difatSectorCount; index++) {
    fat[fatSectorCount + index] = DIFAT_SECTOR;
  }
  for (let index = 0; index < directorySectorCount; index++) {
    fat[directorySector + index] =
      index === directorySectorCount - 1
        ? END_OF_CHAIN
        : directorySector + index + 1;
  }

  bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], 0);
  bytes.set(u16(0x3e), 0x18);
  bytes.set(u16(sectorSize === 4096 ? 4 : 3), 0x1a);
  bytes.set(u16(0xfffe), 0x1c);
  bytes.set(u16(sectorSize === 4096 ? 12 : 9), 0x1e);
  bytes.set(u16(6), 0x20);
  writeU32(bytes, 0x28, sectorSize === 4096 ? directorySectorCount : 0);
  writeU32(bytes, 0x2c, fatSectorCount);
  writeU32(bytes, 0x30, directorySector);
  writeU32(bytes, 0x38, 4096);
  writeU32(bytes, 0x3c, END_OF_CHAIN);
  writeU32(bytes, 0x44, difatSectorCount > 0 ? fatSectorCount : END_OF_CHAIN);
  writeU32(bytes, 0x48, difatSectorCount);

  for (let index = 0; index < HEADER_DIFAT_ENTRIES; index++) {
    writeU32(
      bytes,
      0x4c + index * 4,
      index < fatSectorCount ? index : FREE_SECTOR,
    );
  }

  for (let index = 0; index < difatSectorCount; index++) {
    const offset = sectorOffset(fatSectorCount + index);
    const perSector = entriesPerFatSector - 1;

    for (let slot = 0; slot < perSector; slot++) {
      const fatSector = HEADER_DIFAT_ENTRIES + index * perSector + slot;

      writeU32(
        bytes,
        offset + slot * 4,
        fatSector < fatSectorCount ? fatSector : FREE_SECTOR,
      );
    }
    writeU32(
      bytes,
      offset + perSector * 4,
      index === difatSectorCount - 1
        ? END_OF_CHAIN
        : fatSectorCount + index + 1,
    );
  }

  fat.forEach((value, index) => {
    const fatSector = Math.floor(index / entriesPerFatSector);

    writeU32(
      bytes,
      sectorOffset(fatSector) + (index % entriesPerFatSector) * 4,
      value,
    );
  });

  const unusedRecords =
    directorySectorCount * recordsPerSector - records.length;
  const allRecords = [
    ...records,
    ...Array.from({ length: unusedRecords }, () => ({
      name: "",
      type: 0,
      right: NO_STREAM,
      child: NO_STREAM,
    })),
  ];

  allRecords.forEach((record, index) => {
    const offset =
      sectorOffset(directorySector + Math.floor(index / recordsPerSector)) +
      (index % recordsPerSector) * 128;

    for (let position = 0; position < record.name.length; position++) {
      bytes.set(u16(record.name.charCodeAt(position)), offset + position * 2);
    }
    bytes.set(
      u16(record.name ? (record.name.length + 1) * 2 : 0),
      offset + 0x40,
    );
    bytes[offset + 0x42] = record.type;
    bytes[offset + 0x43] = 1;
    writeU32(bytes, offset + 0x44, NO_STREAM);
    writeU32(bytes, offset + 0x48, record.right);
    writeU32(bytes, offset + 0x4c, record.child);
  });

  return bytes;
}

const SUMMARY_INFORMATION = { name: "\u0005SummaryInformation" };

const DOC = compoundFile([
  { name: "WordDocument" },
  { name: "1Table" },
  SUMMARY_INFORMATION,
]);
const XLS = compoundFile([{ name: "Workbook" }, SUMMARY_INFORMATION]);

describe("detectResourceFileFormat", () => {
  it.each([
    ["a PDF", concat(ascii("%PDF-1.7\n"), new Uint8Array(32)), "pdf"],
    ["a JPEG", Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0, 0x10), "jpeg"],
    [
      "a PNG",
      Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0),
      "png",
    ],
    ["a WebP", concat(ascii("RIFF"), u32(4), ascii("WEBPVP8 ")), "webp"],
    ["a Word document", DOCX, "docx"],
    ["an Excel workbook", XLSX, "xlsx"],
    ["an OpenDocument text", ODT, "odt"],
    ["an OpenDocument spreadsheet", ODS, "ods"],
    ["an old Word document", DOC, "doc"],
    ["an old Excel workbook", XLS, "xls"],
    [
      "an old Excel 5 workbook",
      compoundFile([{ name: "Book" }, SUMMARY_INFORMATION]),
      "xls",
    ],
    [
      "an old Word document in 4096-byte sectors",
      compoundFile([{ name: "WordDocument" }, { name: "0Table" }], {
        sectorSize: 4096,
      }),
      "doc",
    ],
    [
      "an old Word document whose directory spans several sectors",
      compoundFile([
        { name: "WordDocument" },
        { name: "1Table" },
        { name: "Data" },
        SUMMARY_INFORMATION,
        { name: "\u0005DocumentSummaryInformation" },
        { name: "\u0001CompObj" },
      ]),
      "doc",
    ],
  ])("recognises %s from its bytes", (_case, bytes, format) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBe(format);
  });

  it("recognises an old Word document whose directory sits past the header's allocation table list", () => {
    // arrange
    const file = compoundFile([{ name: "WordDocument" }, { name: "1Table" }], {
      directorySector: 14_000,
    });

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(new DataView(file.buffer).getUint32(0x2c, true)).toBeGreaterThan(
      HEADER_DIFAT_ENTRIES,
    );
    expect(detected).toBe("doc");
  });

  it.each([
    ["an empty file", new Uint8Array(0)],
    ["plain text", ascii("Just some notes about squats.")],
    ["an executable", concat(ascii("MZ"), new Uint8Array(64))],
    ["a GIF", ascii("GIF89a")],
    [
      "a PowerPoint presentation",
      zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "ppt/presentation.xml", deflated: true },
      ]),
    ],
    [
      "an EPUB",
      zipArchive([
        { name: "mimetype", content: "application/epub+zip" },
        { name: "META-INF/container.xml", deflated: true },
      ]),
    ],
    [
      "an OpenDocument presentation",
      zipArchive([
        {
          name: "mimetype",
          content: "application/vnd.oasis.opendocument.presentation",
        },
        { name: "content.xml", deflated: true },
      ]),
    ],
    [
      "an OpenDocument text template",
      zipArchive([
        { name: "mimetype", content: `${OPEN_DOCUMENT_TEXT}-template` },
        { name: "content.xml", deflated: true },
      ]),
    ],
    [
      "an OpenDocument text whose mimetype entry is compressed",
      zipArchive([
        { name: "mimetype", content: OPEN_DOCUMENT_TEXT, deflated: true },
        { name: "content.xml", deflated: true },
      ]),
    ],
    [
      "an OpenDocument text whose mimetype entry is not first",
      zipArchive([
        { name: "content.xml", deflated: true },
        { name: "mimetype", content: OPEN_DOCUMENT_TEXT },
      ]),
    ],
    [
      "a plain zip archive",
      zipArchive([{ name: "notes.txt", content: "hello" }]),
    ],
    [
      "a zip holding Word parts but no content types",
      zipArchive([{ name: "word/document.xml", deflated: true }]),
    ],
    [
      "a macro-enabled Word document",
      zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "word/document.xml", deflated: true },
        { name: "word/vbaProject.bin", deflated: true },
      ]),
    ],
    [
      "a macro-enabled Excel workbook",
      zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "xl/workbook.xml", deflated: true },
        { name: "xl/vbaProject.bin", deflated: true },
      ]),
    ],
    [
      "a binary Excel workbook",
      zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "xl/workbook.bin", deflated: true },
      ]),
    ],
    [
      "a zip claiming to be both Word and Excel",
      zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "word/document.xml", deflated: true },
        { name: "xl/workbook.xml", deflated: true },
      ]),
    ],
    [
      "an old PowerPoint presentation",
      compoundFile([
        { name: "PowerPoint Document" },
        { name: "Current User" },
        SUMMARY_INFORMATION,
      ]),
    ],
    [
      "an Outlook message",
      compoundFile([
        { name: "__properties_version1.0" },
        { name: "__substg1.0_0037001F" },
        { name: "__nameid_version1.0", children: [] },
      ]),
    ],
    [
      "an Outlook message carrying a Word attachment",
      compoundFile([
        { name: "__properties_version1.0" },
        {
          name: "__attach_version1.0_#00000000",
          children: [{ name: "WordDocument" }, { name: "1Table" }],
        },
      ]),
    ],
    [
      "an installer",
      compoundFile([
        { name: "䡀㼿䕷䑬㭪䗤䠤" },
        { name: "䡀㬿䕷䑬㭪䗤䠤" },
        SUMMARY_INFORMATION,
      ]),
    ],
    [
      "an old container holding both Word and Excel streams",
      compoundFile([{ name: "WordDocument" }, { name: "Workbook" }]),
    ],
  ])("refuses %s", (_case, bytes) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBeNull();
  });

  describe("on damaged or hostile archives", () => {
    it("refuses a Word document cut off before its central directory", () => {
      // arrange
      const truncated = DOCX.slice(0, DOCX.byteLength - 40);

      // act
      const detected = detectResourceFileFormat(truncated);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses a zip whose central directory points past the end of the file", () => {
      // arrange
      const hostile = DOCX.slice();
      writeU32(hostile, hostile.byteLength - 6, 0x7fffffff);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses a zip whose entry names run past its central directory", () => {
      // arrange
      const hostile = DOCX.slice();
      const directoryOffset = new DataView(hostile.buffer).getUint32(
        hostile.byteLength - 6,
        true,
      );
      hostile.set(u16(0xffff), directoryOffset + 28);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an OpenDocument whose mimetype entry claims more bytes than the file holds", () => {
      // arrange
      const hostile = ODT.slice();
      const directoryOffset = new DataView(hostile.buffer).getUint32(
        hostile.byteLength - 6,
        true,
      );
      writeU32(hostile, directoryOffset + 20, 0x7fffffff);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses a zip holding more entries than any office file holds", () => {
      // arrange
      const hostile = zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "word/document.xml", deflated: true },
        ...Array.from({ length: 4_096 }, (_, index) => ({
          name: `word/media/image${index}.png`,
        })),
      ]);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container cut off after its header", () => {
      // arrange
      const truncated = DOC.slice(0, 512);

      // act
      const detected = detectResourceFileFormat(truncated);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container whose directory chain loops back on itself", () => {
      // arrange
      const hostile = DOC.slice();
      writeU32(hostile, 512 + 1 * 4, 1);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container whose directory starts past the end of the file", () => {
      // arrange
      const hostile = DOC.slice();
      writeU32(hostile, 0x30, 99_999);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container whose allocation table list loops back on itself", () => {
      // arrange
      const file = compoundFile([{ name: "WordDocument" }], {
        directorySector: 14_000,
      });
      const difatSector = new DataView(file.buffer).getUint32(0x44, true);
      const difatOffset = (difatSector + 1) * 512;
      for (let slot = 0; slot < 127; slot++) {
        writeU32(file, difatOffset + slot * 4, 109);
      }
      writeU32(file, difatOffset + 127 * 4, difatSector);
      writeU32(file, 0x2c, 237);

      // act
      const detected = detectResourceFileFormat(file);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container whose directory tree loops back on itself", () => {
      // arrange
      const hostile = DOC.slice();
      const secondEntry = 2 * 512 + 2 * 128;
      writeU32(hostile, secondEntry + 0x48, 1);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });

    it("refuses an old container with an unknown sector size", () => {
      // arrange
      const hostile = DOC.slice();
      hostile.set(u16(16), 0x1e);

      // act
      const detected = detectResourceFileFormat(hostile);

      // assert
      expect(detected).toBeNull();
    });
  });
});
