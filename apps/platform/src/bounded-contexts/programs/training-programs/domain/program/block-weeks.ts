import type { BlockType } from "./vocabulary";

const DELOAD_WEEKS = 1;

export class BlockWeeks {
  static forType(type: BlockType, weeks: number): number {
    return type === "deload" ? DELOAD_WEEKS : weeks;
  }

  static isAllowed(type: BlockType, weeks: number): boolean {
    return (
      Number.isInteger(weeks) &&
      weeks >= 1 &&
      BlockWeeks.forType(type, weeks) === weeks
    );
  }
}
