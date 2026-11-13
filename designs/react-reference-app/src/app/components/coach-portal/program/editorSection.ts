import { BLOCK_TYPE_LABELS, type Block } from '../../../domain/program';

export type EditorMode = 'structure' | 'texts';
export type EditorSection = { kind: 'plan' } | { kind: 'block'; blockId: string };

const BLOCK_HASH_PREFIX = '#block-';
const PLAN_HASH = '#plan';
const TEXTS_PATH_SUFFIX = '/texts';

export const EDITOR_MODE_LABELS: Record<EditorMode, string> = {
  structure: 'Structure',
  texts: 'Texts',
};

export function sectionHash(section: EditorSection): string {
  return section.kind === 'block' ? `${BLOCK_HASH_PREFIX}${section.blockId}` : PLAN_HASH;
}

export function sectionFromHash(hash: string, blocks: readonly Block[]): EditorSection | null {
  if (hash === PLAN_HASH) return { kind: 'plan' };
  if (!hash.startsWith(BLOCK_HASH_PREFIX)) return null;
  const blockId = hash.slice(BLOCK_HASH_PREFIX.length);
  return blocks.some(block => block.id === blockId) ? { kind: 'block', blockId } : null;
}

export function modeOfPath(pathname: string): EditorMode {
  return pathname.endsWith(TEXTS_PATH_SUFFIX) ? 'texts' : 'structure';
}

export function modePath(draftPath: string, mode: EditorMode): string {
  return mode === 'texts' ? `${draftPath}${TEXTS_PATH_SUFFIX}` : draftPath;
}

export function isSameSection(a: EditorSection, b: EditorSection): boolean {
  if (a.kind === 'block' && b.kind === 'block') return a.blockId === b.blockId;
  return a.kind === b.kind;
}

export function sectionTitle(section: EditorSection, blocks: readonly Block[]): string {
  if (section.kind === 'plan') return 'Overview';
  const index = blocks.findIndex(block => block.id === section.blockId);
  return `Block ${index + 1} · ${BLOCK_TYPE_LABELS[blocks[index].type]}`;
}
