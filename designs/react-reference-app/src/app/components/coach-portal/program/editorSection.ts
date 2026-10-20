import type { Block } from '../../../domain/program';

export type EditorSection =
  | { kind: 'header' }
  | { kind: 'plan' }
  | { kind: 'block'; blockId: string }
  | { kind: 'cycle' }
  | { kind: 'nutrition' }
  | { kind: 'lifestyle' };

const BLOCK_HASH_PREFIX = '#block-';
const NAMED_SECTIONS: Record<string, EditorSection> = {
  '#header': { kind: 'header' },
  '#plan': { kind: 'plan' },
  '#cycle': { kind: 'cycle' },
  '#nutrition': { kind: 'nutrition' },
  '#lifestyle': { kind: 'lifestyle' },
};

export function sectionHash(section: EditorSection): string {
  return section.kind === 'block' ? `${BLOCK_HASH_PREFIX}${section.blockId}` : `#${section.kind}`;
}

export function sectionFromHash(hash: string, blocks: readonly Block[]): EditorSection | null {
  if (!hash.startsWith(BLOCK_HASH_PREFIX)) return NAMED_SECTIONS[hash] ?? null;
  const blockId = hash.slice(BLOCK_HASH_PREFIX.length);
  return blocks.some(block => block.id === blockId) ? { kind: 'block', blockId } : null;
}

export function isSameSection(a: EditorSection, b: EditorSection): boolean {
  return sectionHash(a) === sectionHash(b);
}
