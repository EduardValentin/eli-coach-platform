import type { Block } from "./program-content";

type SequenceProblemCode =
  "foundation-not-first" | "starts-with-deload" | "consecutive-deloads";

export type SequenceProblem = { code: SequenceProblemCode; blockId: string };

const MESSAGES: Record<SequenceProblemCode, string> = {
  "foundation-not-first": "Foundation must be the first block",
  "starts-with-deload": "The plan cannot start with a Deload",
  "consecutive-deloads": "Two Deloads cannot follow each other",
};

export class PlanSequence {
  static problemsOf(blocks: readonly Block[]): SequenceProblem[] {
    const problems: SequenceProblem[] = [];
    if (blocks[0]?.type === "deload") {
      problems.push({ code: "starts-with-deload", blockId: blocks[0].id });
    }
    blocks.forEach((block, index) => {
      if (block.type === "foundation" && index > 0) {
        problems.push({ code: "foundation-not-first", blockId: block.id });
      }
      if (block.type === "deload" && blocks[index - 1]?.type === "deload") {
        problems.push({ code: "consecutive-deloads", blockId: block.id });
      }
    });

    return problems;
  }

  static messageOf({ code }: SequenceProblem): string {
    return MESSAGES[code];
  }
}
