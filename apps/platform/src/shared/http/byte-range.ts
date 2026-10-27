type RequestedByteRange =
  | { kind: "from"; start: number; end: number | null }
  | { kind: "suffix"; length: number };

export type ServedByteRange = { start: number; end: number };

const SINGLE_BYTE_RANGE = /^bytes=[ \t]*(\d*)-(\d*)$/i;

export function parseByteRange(
  header: string | null,
): RequestedByteRange | null {
  const [, first, last] = SINGLE_BYTE_RANGE.exec(header?.trim() ?? "") ?? [];

  if (!first && !last) {
    return null;
  }

  const start = first ? Number(first) : null;
  const end = last ? Number(last) : null;
  const unsafe = [start, end].some(
    (bound) => bound !== null && !Number.isSafeInteger(bound),
  );

  if (unsafe || (start !== null && end !== null && end < start)) {
    return null;
  }

  if (start === null) {
    return { kind: "suffix", length: Number(last) };
  }

  return { kind: "from", start, end };
}
