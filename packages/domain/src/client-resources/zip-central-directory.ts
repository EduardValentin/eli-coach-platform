import { type ByteView, nullWhenOutsideTheFile } from "./byte-view";

const END_OF_CENTRAL_DIRECTORY = {
  signature: 0x06054b50,
  length: 22,
  maxCommentLength: 0xffff,
  offsetOf: { entryCount: 10, directoryLength: 12, directoryStart: 16 },
} as const;

const CENTRAL_DIRECTORY_ENTRY = {
  signature: 0x02014b50,
  length: 46,
  offsetOf: {
    method: 10,
    compressedSize: 20,
    nameLength: 28,
    extraFieldLength: 30,
    commentLength: 32,
    localHeaderOffset: 42,
  },
} as const;

const LOCAL_FILE_HEADER = {
  length: 30,
  offsetOf: { nameLength: 26, extraFieldLength: 28 },
} as const;

const ARCHIVE_START = 0;
const MAX_ZIP_ENTRIES = 4096;
const STORED = 0;

export const OPEN_DOCUMENT_MIMETYPE_ENTRY = "mimetype";
const MAX_OPEN_DOCUMENT_MIMETYPE_LENGTH = 128;

type CentralDirectoryEntry = {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
};

export function zipEntryNames(file: ByteView): string[] | null {
  return nullWhenOutsideTheFile(
    () => centralDirectoryEntries(file)?.map((entry) => entry.name) ?? null,
  );
}

export function openDocumentMimetype(file: ByteView): string | null {
  return nullWhenOutsideTheFile(() => {
    const first = centralDirectoryEntries(file)?.[0];

    if (first?.name !== OPEN_DOCUMENT_MIMETYPE_ENTRY) return null;

    return storedMimetype(file, first);
  });
}

function centralDirectoryEntries(
  file: ByteView,
): CentralDirectoryEntry[] | null {
  const end = endOfCentralDirectory(file);

  if (end === null) return null;

  const fields = END_OF_CENTRAL_DIRECTORY.offsetOf;
  const entryCount = file.u16(end + fields.entryCount);
  const directoryStart = file.u32(end + fields.directoryStart);
  const directoryEnd = directoryStart + file.u32(end + fields.directoryLength);

  if (entryCount > MAX_ZIP_ENTRIES || directoryEnd > end) return null;

  const entries: CentralDirectoryEntry[] = [];
  let offset = directoryStart;

  for (let index = 0; index < entryCount; index++) {
    if (offset + CENTRAL_DIRECTORY_ENTRY.length > directoryEnd) return null;
    if (file.u32(offset) !== CENTRAL_DIRECTORY_ENTRY.signature) return null;

    const entryFields = CENTRAL_DIRECTORY_ENTRY.offsetOf;
    const nameLength = file.u16(offset + entryFields.nameLength);
    const recordLength =
      CENTRAL_DIRECTORY_ENTRY.length +
      nameLength +
      file.u16(offset + entryFields.extraFieldLength) +
      file.u16(offset + entryFields.commentLength);

    if (offset + recordLength > directoryEnd) return null;

    entries.push({
      name: file.ascii(offset + CENTRAL_DIRECTORY_ENTRY.length, nameLength),
      method: file.u16(offset + entryFields.method),
      compressedSize: file.u32(offset + entryFields.compressedSize),
      localHeaderOffset: file.u32(offset + entryFields.localHeaderOffset),
    });
    offset += recordLength;
  }

  return entries;
}

function endOfCentralDirectory(file: ByteView): number | null {
  const last = file.length - END_OF_CENTRAL_DIRECTORY.length;
  const first = Math.max(
    ARCHIVE_START,
    last - END_OF_CENTRAL_DIRECTORY.maxCommentLength,
  );

  for (let offset = last; offset >= first; offset--) {
    if (file.u32(offset) === END_OF_CENTRAL_DIRECTORY.signature) return offset;
  }

  return null;
}

function storedMimetype(
  file: ByteView,
  mimetype: CentralDirectoryEntry,
): string | null {
  if (
    mimetype.method !== STORED ||
    mimetype.localHeaderOffset !== ARCHIVE_START ||
    mimetype.compressedSize > MAX_OPEN_DOCUMENT_MIMETYPE_LENGTH
  ) {
    return null;
  }

  const header = mimetype.localHeaderOffset;
  const contentStart =
    header +
    LOCAL_FILE_HEADER.length +
    file.u16(header + LOCAL_FILE_HEADER.offsetOf.nameLength) +
    file.u16(header + LOCAL_FILE_HEADER.offsetOf.extraFieldLength);

  return file.ascii(contentStart, mimetype.compressedSize);
}
