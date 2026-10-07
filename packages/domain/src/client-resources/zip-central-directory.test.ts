import { describe, expect, it } from "vitest";

import { ByteView } from "./byte-view";
import { detectResourceFileFormat } from "./resource-file-signature";
import { openDocumentMimetype, zipEntryNames } from "./zip-central-directory";

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

function centralDirectoryStart(archive: Uint8Array): number {
  return new DataView(archive.buffer).getUint32(archive.byteLength - 6, true);
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

describe("zipEntryNames", () => {
  it("lists every entry of an archive in central directory order", () => {
    // arrange
    const file = new ByteView(DOCX);

    // act
    const names = zipEntryNames(file);

    // assert
    expect(names).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "word/document.xml",
      "word/styles.xml",
    ]);
  });

  describe("on damaged or hostile archives", () => {
    it("refuses a Word document cut off before its central directory", () => {
      // arrange
      const truncated = DOCX.slice(0, DOCX.byteLength - 40);

      // act
      const names = zipEntryNames(new ByteView(truncated));

      // assert
      expect(names).toBeNull();
    });

    it("refuses a zip whose central directory points past the end of the file", () => {
      // arrange
      const hostile = DOCX.slice();
      writeU32(hostile, hostile.byteLength - 6, 0x7fffffff);

      // act
      const names = zipEntryNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });

    it("refuses a zip whose entry names run past its central directory", () => {
      // arrange
      const hostile = DOCX.slice();
      hostile.set(u16(0xffff), centralDirectoryStart(hostile) + 28);

      // act
      const names = zipEntryNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
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
      const names = zipEntryNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });
  });
});

describe("openDocumentMimetype", () => {
  it.each([
    {
      description: "an OpenDocument text",
      archive: ODT,
      mimetype: OPEN_DOCUMENT_TEXT,
    },
    {
      description: "an OpenDocument spreadsheet",
      archive: ODS,
      mimetype: OPEN_DOCUMENT_SPREADSHEET,
    },
  ])("reads the mimetype $description declares", ({ archive, mimetype }) => {
    // arrange
    const file = new ByteView(archive);

    // act
    const declared = openDocumentMimetype(file);

    // assert
    expect(declared).toBe(mimetype);
  });

  describe("on damaged or hostile archives", () => {
    it("refuses an OpenDocument text whose mimetype entry is compressed", () => {
      // arrange
      const hostile = zipArchive([
        { name: "mimetype", content: OPEN_DOCUMENT_TEXT, deflated: true },
        { name: "content.xml", deflated: true },
      ]);

      // act
      const declared = openDocumentMimetype(new ByteView(hostile));

      // assert
      expect(declared).toBeNull();
    });

    it("refuses an OpenDocument whose mimetype entry claims more bytes than the file holds", () => {
      // arrange
      const hostile = ODT.slice();
      writeU32(hostile, centralDirectoryStart(hostile) + 20, 0x7fffffff);

      // act
      const declared = openDocumentMimetype(new ByteView(hostile));

      // assert
      expect(declared).toBeNull();
    });
  });
});

describe("detectResourceFileFormat on a zip archive", () => {
  it.each([
    { description: "a Word document", bytes: DOCX, format: "docx" },
    { description: "an Excel workbook", bytes: XLSX, format: "xlsx" },
    { description: "an OpenDocument text", bytes: ODT, format: "odt" },
    { description: "an OpenDocument spreadsheet", bytes: ODS, format: "ods" },
  ])("recognises $description from its bytes", ({ bytes, format }) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBe(format);
  });

  it.each([
    {
      description: "a PowerPoint presentation",
      bytes: zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "ppt/presentation.xml", deflated: true },
      ]),
    },
    {
      description: "an EPUB",
      bytes: zipArchive([
        { name: "mimetype", content: "application/epub+zip" },
        { name: "META-INF/container.xml", deflated: true },
      ]),
    },
    {
      description: "an OpenDocument presentation",
      bytes: zipArchive([
        {
          name: "mimetype",
          content: "application/vnd.oasis.opendocument.presentation",
        },
        { name: "content.xml", deflated: true },
      ]),
    },
    {
      description: "a zip whose mimetype entry names an object property",
      bytes: zipArchive([
        { name: "mimetype", content: "constructor" },
        { name: "content.xml", deflated: true },
      ]),
    },
    {
      description: "a zip whose mimetype entry names an inherited method",
      bytes: zipArchive([
        { name: "mimetype", content: "toString" },
        { name: "content.xml", deflated: true },
      ]),
    },
    {
      description: "an OpenDocument text template",
      bytes: zipArchive([
        { name: "mimetype", content: `${OPEN_DOCUMENT_TEXT}-template` },
        { name: "content.xml", deflated: true },
      ]),
    },
    {
      description: "an OpenDocument text whose mimetype entry is not first",
      bytes: zipArchive([
        { name: "content.xml", deflated: true },
        { name: "mimetype", content: OPEN_DOCUMENT_TEXT },
      ]),
    },
    {
      description: "a plain zip archive",
      bytes: zipArchive([{ name: "notes.txt", content: "hello" }]),
    },
    {
      description: "a zip holding Word parts but no content types",
      bytes: zipArchive([{ name: "word/document.xml", deflated: true }]),
    },
    {
      description: "a macro-enabled Word document",
      bytes: zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "word/document.xml", deflated: true },
        { name: "word/vbaProject.bin", deflated: true },
      ]),
    },
    {
      description: "a macro-enabled Excel workbook",
      bytes: zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "xl/workbook.xml", deflated: true },
        { name: "xl/vbaProject.bin", deflated: true },
      ]),
    },
    {
      description: "a binary Excel workbook",
      bytes: zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "xl/workbook.bin", deflated: true },
      ]),
    },
    {
      description: "a zip claiming to be both Word and Excel",
      bytes: zipArchive([
        { name: "[Content_Types].xml", deflated: true },
        { name: "word/document.xml", deflated: true },
        { name: "xl/workbook.xml", deflated: true },
      ]),
    },
  ])("refuses $description", ({ bytes }) => {
    // arrange
    const file = bytes;

    // act
    const detected = detectResourceFileFormat(file);

    // assert
    expect(detected).toBeNull();
  });
});
