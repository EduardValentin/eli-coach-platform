import { describe, expect, it } from "vitest";

import { ByteView } from "./byte-view";
import { rootStreamNames } from "./compound-file-directory";
import { detectResourceFileFormat } from "./resource-file-signature";

const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;
const FAT_SECTOR = 0xfffffffd;
const DIFAT_SECTOR = 0xfffffffc;
const NO_STREAM = 0xffffffff;
const HEADER_DIFAT_ENTRIES = 109;

function u16(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(bytes: Uint8Array, offset: number, value: number): void {
  new DataView(bytes.buffer).setUint32(offset, value, true);
}

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

describe("rootStreamNames", () => {
  it.each([
    {
      description: "an old Word document",
      bytes: DOC,
      streams: ["WordDocument", "1Table", SUMMARY_INFORMATION.name],
    },
    {
      description: "an old Word document in 4096-byte sectors",
      bytes: compoundFile([{ name: "WordDocument" }, { name: "0Table" }], {
        sectorSize: 4096,
      }),
      streams: ["WordDocument", "0Table"],
    },
    {
      description: "an old Word document whose directory spans several sectors",
      bytes: compoundFile([
        { name: "WordDocument" },
        { name: "1Table" },
        { name: "Data" },
        SUMMARY_INFORMATION,
        { name: "\u0005DocumentSummaryInformation" },
        { name: "\u0001CompObj" },
      ]),
      streams: [
        "WordDocument",
        "1Table",
        "Data",
        SUMMARY_INFORMATION.name,
        "\u0005DocumentSummaryInformation",
        "\u0001CompObj",
      ],
    },
  ])("lists the root streams of $description", ({ bytes, streams }) => {
    // arrange
    const file = new ByteView(bytes);

    // act
    const names = rootStreamNames(file);

    // assert
    expect(names).toEqual(streams);
  });

  it("lists the root streams of an old Word document whose directory sits past the header's allocation table list", () => {
    // arrange
    const bytes = compoundFile([{ name: "WordDocument" }, { name: "1Table" }], {
      directorySector: 14_000,
    });

    // act
    const names = rootStreamNames(new ByteView(bytes));

    // assert
    expect(new DataView(bytes.buffer).getUint32(0x2c, true)).toBeGreaterThan(
      HEADER_DIFAT_ENTRIES,
    );
    expect(names).toEqual(["WordDocument", "1Table"]);
  });

  describe("on damaged or hostile files", () => {
    it("refuses an old container cut off after its header", () => {
      // arrange
      const truncated = DOC.slice(0, 512);

      // act
      const names = rootStreamNames(new ByteView(truncated));

      // assert
      expect(names).toBeNull();
    });

    it("refuses an old container whose directory chain loops back on itself", () => {
      // arrange
      const hostile = DOC.slice();
      writeU32(hostile, 512 + 1 * 4, 1);

      // act
      const names = rootStreamNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });

    it("refuses an old container whose directory starts past the end of the file", () => {
      // arrange
      const hostile = DOC.slice();
      writeU32(hostile, 0x30, 99_999);

      // act
      const names = rootStreamNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });

    it("refuses an old container whose allocation table list loops back on itself", () => {
      // arrange
      const hostile = compoundFile([{ name: "WordDocument" }], {
        directorySector: 14_000,
      });
      const difatSector = new DataView(hostile.buffer).getUint32(0x44, true);
      const difatOffset = (difatSector + 1) * 512;
      for (let slot = 0; slot < 127; slot++) {
        writeU32(hostile, difatOffset + slot * 4, 109);
      }
      writeU32(hostile, difatOffset + 127 * 4, difatSector);
      writeU32(hostile, 0x2c, 237);

      // act
      const names = rootStreamNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });

    it("refuses an old container whose directory tree loops back on itself", () => {
      // arrange
      const hostile = DOC.slice();
      const secondEntry = 2 * 512 + 2 * 128;
      writeU32(hostile, secondEntry + 0x48, 1);

      // act
      const names = rootStreamNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });

    it("refuses an old container with an unknown sector size", () => {
      // arrange
      const hostile = DOC.slice();
      hostile.set(u16(16), 0x1e);

      // act
      const names = rootStreamNames(new ByteView(hostile));

      // assert
      expect(names).toBeNull();
    });
  });
});

describe("detectResourceFileFormat on a compound file", () => {
  it.each([
    { description: "an old Word document", bytes: DOC, format: "doc" },
    { description: "an old Excel workbook", bytes: XLS, format: "xls" },
    {
      description: "an old Excel 5 workbook",
      bytes: compoundFile([{ name: "Book" }, SUMMARY_INFORMATION]),
      format: "xls",
    },
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
      description: "an old PowerPoint presentation",
      bytes: compoundFile([
        { name: "PowerPoint Document" },
        { name: "Current User" },
        SUMMARY_INFORMATION,
      ]),
    },
    {
      description: "an Outlook message",
      bytes: compoundFile([
        { name: "__properties_version1.0" },
        { name: "__substg1.0_0037001F" },
        { name: "__nameid_version1.0", children: [] },
      ]),
    },
    {
      description: "an Outlook message carrying a Word attachment",
      bytes: compoundFile([
        { name: "__properties_version1.0" },
        {
          name: "__attach_version1.0_#00000000",
          children: [{ name: "WordDocument" }, { name: "1Table" }],
        },
      ]),
    },
    {
      description: "an installer",
      bytes: compoundFile([
        { name: "䡀㼿䕷䑬㭪䗤䠤" },
        { name: "䡀㬿䕷䑬㭪䗤䠤" },
        SUMMARY_INFORMATION,
      ]),
    },
    {
      description: "an old container holding both Word and Excel streams",
      bytes: compoundFile([{ name: "WordDocument" }, { name: "Workbook" }]),
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
