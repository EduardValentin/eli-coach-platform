import { type ByteView, nullWhenOutsideTheFile } from "./byte-view";

const COMPOUND_FILE_HEADER = {
  occupiedSectors: 1,
  allocationTableEntries: 109,
  offsetOf: {
    majorVersion: 0x1a,
    byteOrder: 0x1c,
    sectorShift: 0x1e,
    allocationSectorCount: 0x2c,
    firstDirectorySector: 0x30,
    firstExtensionSector: 0x44,
    allocationTable: 0x4c,
  },
} as const;

const DIRECTORY_ENTRY = {
  length: 128,
  maxNameLength: 64,
  offsetOf: {
    name: 0x00,
    nameLength: 0x40,
    type: 0x42,
    leftSibling: 0x44,
    rightSibling: 0x48,
    child: 0x4c,
  },
} as const;

const COMPOUND_FILE_GEOMETRIES = [
  { majorVersion: 3, sectorShift: 9 },
  { majorVersion: 4, sectorShift: 12 },
];
const COMPOUND_FILE_BYTE_ORDER = 0xfffe;
const SECTOR_NUMBER_LENGTH = 4;
const EXTENSION_SECTOR_LINK_SLOTS = 1;
const END_OF_CHAIN = 0xfffffffe;
const NO_ENTRY = 0xffffffff;
const ROOT_ENTRY = 0;
const ROOT_STORAGE = 5;
const STREAM = 2;
const MAX_ROOT_ENTRIES = 4096;
const NAME_CODE_UNIT_LENGTH = 2;
const NAME_TERMINATOR_CODE_UNITS = 1;

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

export function rootStreamNames(file: ByteView): string[] | null {
  return nullWhenOutsideTheFile(() => {
    const layout = compoundFileLayout(file);

    if (!layout) return null;

    const allocationSectors = allocationTableSectors(file, layout);

    if (!allocationSectors) return null;

    return new CompoundDirectory(file, layout, allocationSectors).streamNames();
  });
}

function compoundFileLayout(file: ByteView): CompoundFileLayout | null {
  const fields = COMPOUND_FILE_HEADER.offsetOf;
  const majorVersion = file.u16(fields.majorVersion);
  const sectorShift = file.u16(fields.sectorShift);
  const knownGeometry = COMPOUND_FILE_GEOMETRIES.some(
    (geometry) =>
      geometry.majorVersion === majorVersion &&
      geometry.sectorShift === sectorShift,
  );

  if (
    !knownGeometry ||
    file.u16(fields.byteOrder) !== COMPOUND_FILE_BYTE_ORDER
  ) {
    return null;
  }

  const sectorSize = 2 ** sectorShift;
  const headerSize = COMPOUND_FILE_HEADER.occupiedSectors * sectorSize;

  return {
    sectorSize,
    sectorCount: Math.max(
      0,
      Math.ceil((file.length - headerSize) / sectorSize),
    ),
    allocationSectorCount: file.u32(fields.allocationSectorCount),
    firstDirectorySector: file.u32(fields.firstDirectorySector),
    firstExtensionSector: file.u32(fields.firstExtensionSector),
  };
}

function allocationTableSectors(
  file: ByteView,
  layout: CompoundFileLayout,
): number[] | null {
  const wanted = layout.allocationSectorCount;

  if (wanted > layout.sectorCount) return null;

  const sectors = readSectorNumbers(file, {
    offset: COMPOUND_FILE_HEADER.offsetOf.allocationTable,
    count: Math.min(wanted, COMPOUND_FILE_HEADER.allocationTableEntries),
  });
  const numbersPerExtensionSector =
    layout.sectorSize / SECTOR_NUMBER_LENGTH - EXTENSION_SECTOR_LINK_SLOTS;
  const visited = new Set<number>();
  let extensionSector = layout.firstExtensionSector;

  while (sectors.length < wanted) {
    if (!isSector(layout, extensionSector) || visited.has(extensionSector)) {
      return null;
    }
    visited.add(extensionSector);

    const offset = sectorOffset(layout, extensionSector);

    sectors.push(
      ...readSectorNumbers(file, {
        offset,
        count: Math.min(numbersPerExtensionSector, wanted - sectors.length),
      }),
    );
    extensionSector = file.u32(
      offset + numbersPerExtensionSector * SECTOR_NUMBER_LENGTH,
    );
  }

  return sectors.every((sector) => isSector(layout, sector)) ? sectors : null;
}

function readSectorNumbers(
  file: ByteView,
  { offset, count }: { offset: number; count: number },
): number[] {
  return Array.from({ length: count }, (_, index) =>
    file.u32(offset + index * SECTOR_NUMBER_LENGTH),
  );
}

class CompoundDirectory {
  private readonly entriesPerSector: number;

  constructor(
    private readonly file: ByteView,
    private readonly layout: CompoundFileLayout,
    private readonly allocationSectors: readonly number[],
  ) {
    this.entriesPerSector = layout.sectorSize / DIRECTORY_ENTRY.length;
  }

  streamNames(): string[] | null {
    const chain = this.directoryChain();
    const root = chain ? this.entry(chain, ROOT_ENTRY) : null;

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
    const numbersPerSector = this.layout.sectorSize / SECTOR_NUMBER_LENGTH;
    const allocationSector =
      this.allocationSectors[Math.floor(sector / numbersPerSector)];

    if (allocationSector === undefined) return null;

    return this.file.u32(
      sectorOffset(this.layout, allocationSector) +
        (sector % numbersPerSector) * SECTOR_NUMBER_LENGTH,
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
      (index % this.entriesPerSector) * DIRECTORY_ENTRY.length;
    const fields = DIRECTORY_ENTRY.offsetOf;

    return {
      name: this.entryName(offset),
      type: this.file.u8(offset + fields.type),
      leftSibling: this.file.u32(offset + fields.leftSibling),
      rightSibling: this.file.u32(offset + fields.rightSibling),
      child: this.file.u32(offset + fields.child),
    };
  }

  private entryName(offset: number): string {
    const byteLength = this.file.u16(
      offset + DIRECTORY_ENTRY.offsetOf.nameLength,
    );

    if (
      byteLength < NAME_CODE_UNIT_LENGTH ||
      byteLength > DIRECTORY_ENTRY.maxNameLength ||
      byteLength % NAME_CODE_UNIT_LENGTH !== 0
    ) {
      return "";
    }

    return this.file.utf16(
      offset + DIRECTORY_ENTRY.offsetOf.name,
      byteLength / NAME_CODE_UNIT_LENGTH - NAME_TERMINATOR_CODE_UNITS,
    );
  }
}

function isSector(layout: CompoundFileLayout, sector: number): boolean {
  return sector < layout.sectorCount;
}

function sectorOffset(layout: CompoundFileLayout, sector: number): number {
  return (sector + COMPOUND_FILE_HEADER.occupiedSectors) * layout.sectorSize;
}
