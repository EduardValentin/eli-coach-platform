import {
  BLOCK_TYPE_LABELS,
  type Block,
} from "~/bounded-contexts/programs/training-programs/public/program-editing";

export type EditorSection =
  { kind: "plan" } | { kind: "block"; blockId: string };

const BLOCK_HASH_PREFIX = "#block-";
const PLAN_HASH = "#plan";

export const OVERVIEW: EditorSection = { kind: "plan" };

export function sectionHash(section: EditorSection): string {
  return section.kind === "block"
    ? `${BLOCK_HASH_PREFIX}${section.blockId}`
    : PLAN_HASH;
}

export function sectionFromHash(
  hash: string,
  blocks: readonly Block[],
): EditorSection {
  if (!hash.startsWith(BLOCK_HASH_PREFIX)) return OVERVIEW;
  const blockId = hash.slice(BLOCK_HASH_PREFIX.length);

  return blocks.some((block) => block.id === blockId)
    ? { kind: "block", blockId }
    : OVERVIEW;
}

export function isSameSection(a: EditorSection, b: EditorSection): boolean {
  if (a.kind === "block" && b.kind === "block") return a.blockId === b.blockId;

  return a.kind === b.kind;
}

export function sectionTitle(
  section: EditorSection,
  blocks: readonly Block[],
): string {
  if (section.kind === "plan") return "Overview";
  const index = blocks.findIndex((block) => block.id === section.blockId);

  return `Block ${index + 1} · ${BLOCK_TYPE_LABELS[blocks[index].type]}`;
}
