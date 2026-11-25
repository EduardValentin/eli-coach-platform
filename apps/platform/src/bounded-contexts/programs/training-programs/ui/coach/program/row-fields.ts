import type { Range } from "~/bounded-contexts/programs/training-programs/ui/shared/program-view/program-view";

export const RANGE_PROBLEM = "Use a number or a range like 8–12";
export const COUNT_PROBLEM = "Use a whole number";

const RANGE_PATTERN = /^(\d+)(?:\s*[-–]\s*(\d+))?$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;

function parseWholeNumber(text: string): number | null {
  const trimmed = text.trim();

  return WHOLE_NUMBER_PATTERN.test(trimmed) ? Number(trimmed) : null;
}

export function parseCount(text: string): number | null {
  const count = parseWholeNumber(text);

  return count !== null && count > 0 ? count : null;
}

export function parseRange(text: string): Range | null {
  const match = RANGE_PATTERN.exec(text.trim());
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] === undefined ? min : Number(match[2]);

  return min <= max ? { min, max } : null;
}
