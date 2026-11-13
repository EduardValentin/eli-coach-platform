import { BLOCK_TYPE_LABELS, type Block } from '../../../domain/program';

export type EditorSection = { kind: 'setup' } | { kind: 'plan' } | { kind: 'block'; blockId: string } | { kind: 'texts' };
export type StructureSection = Exclude<EditorSection, { kind: 'texts' }>;

const BLOCK_HASH_PREFIX = '#block-';
const TEXTS_PATH_SUFFIX = '/texts';
const NAMED_SECTIONS: Record<string, StructureSection> = {
  '#setup': { kind: 'setup' },
  '#plan': { kind: 'plan' },
};

export function sectionHash(section: StructureSection): string {
  return section.kind === 'block' ? `${BLOCK_HASH_PREFIX}${section.blockId}` : `#${section.kind}`;
}

export function sectionFromHash(hash: string, blocks: readonly Block[]): StructureSection | null {
  if (!hash.startsWith(BLOCK_HASH_PREFIX)) return NAMED_SECTIONS[hash] ?? null;
  const blockId = hash.slice(BLOCK_HASH_PREFIX.length);
  return blocks.some(block => block.id === blockId) ? { kind: 'block', blockId } : null;
}

export function isTextsPath(pathname: string): boolean {
  return pathname.endsWith(TEXTS_PATH_SUFFIX);
}

export function textsPath(draftPath: string): string {
  return `${draftPath}${TEXTS_PATH_SUFFIX}`;
}

export function isSameSection(a: EditorSection, b: EditorSection): boolean {
  if (a.kind === 'block' && b.kind === 'block') return a.blockId === b.blockId;
  return a.kind === b.kind;
}

const NAMED_TITLES: Record<Exclude<EditorSection['kind'], 'block'>, string> = {
  setup: 'Setup',
  plan: 'Overview',
  texts: 'Texts',
};

export function sectionTitle(section: EditorSection, blocks: readonly Block[]): string {
  if (section.kind !== 'block') return NAMED_TITLES[section.kind];
  const index = blocks.findIndex(block => block.id === section.blockId);
  return `Block ${index + 1} · ${BLOCK_TYPE_LABELS[blocks[index].type]}`;
}
