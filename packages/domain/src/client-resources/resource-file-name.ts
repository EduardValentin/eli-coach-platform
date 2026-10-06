const MAX_FILE_NAME_CHARACTERS = 255;

type CodePointRange = readonly [first: number, last: number];

const UNSAFE_CODE_POINTS: readonly CodePointRange[] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];

type FileNameParts = { stem: string; extension: string };

function fileNameParts(fileName: string): FileNameParts {
  const dot = fileName.lastIndexOf(".");

  if (dot <= 0) return { stem: fileName, extension: "" };

  return { stem: fileName.slice(0, dot), extension: fileName.slice(dot + 1) };
}

function isSafeCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;

  return !UNSAFE_CODE_POINTS.some(
    ([first, last]) => codePoint >= first && codePoint <= last,
  );
}

function withoutUnsafeCharacters(fileName: string): string {
  return Array.from(fileName).filter(isSafeCharacter).join("");
}

function keptExtension(
  extension: string,
  formatExtensions: readonly [string, ...string[]],
): string {
  return formatExtensions.includes(extension.toLowerCase())
    ? extension
    : formatExtensions[0];
}

function shortenedStem(stem: string, extension: string): string {
  const room = MAX_FILE_NAME_CHARACTERS - extension.length - 1;

  return Array.from(stem).slice(0, room).join("");
}

export function pinnedFileName(
  originalName: string,
  formatExtensions: readonly [string, ...string[]],
): string {
  const parts = fileNameParts(withoutUnsafeCharacters(originalName));
  const extension = keptExtension(parts.extension, formatExtensions);

  return `${shortenedStem(parts.stem, extension)}.${extension}`;
}
