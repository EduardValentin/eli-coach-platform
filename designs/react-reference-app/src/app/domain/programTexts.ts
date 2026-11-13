import type { Block, ProgramContent, ProgramLanguage, ProgramVersion } from './program';
import { fillTemplate, guideText, templateText, withGuideText, withoutGuideText, type GuideTextKey, type TemplateText } from './programTemplates';

export type VersionTextKey = 'title' | 'focus' | 'personalNote' | 'whatChanged' | 'nutrition' | 'lifestyle';
export type BlockTextKey = 'intro' | 'note' | 'split' | 'missedDay';

export type ProgramTextTarget =
  | { kind: 'version'; key: VersionTextKey }
  | { kind: 'guide'; key: GuideTextKey }
  | { kind: 'block'; blockId: string; key: BlockTextKey };

type TextDescription = { name: string; placeholder: string; hint?: string };

export type ProgramText = TextDescription & {
  value: string;
  standard: string | null;
  pending: boolean;
};

const VERSION_TEXTS: Record<VersionTextKey, TextDescription> = {
  title: { name: 'Program title', placeholder: 'e.g. Program — weeks 1–4' },
  focus: { name: 'Focus until the next check-in', placeholder: 'What she concentrates on until her next check-in form' },
  personalNote: { name: 'Personal note', placeholder: 'A few words from you to open her program' },
  whatChanged: { name: 'What changed and why', placeholder: 'What you changed in this version, and why' },
  nutrition: { name: 'Nutrition', placeholder: 'e.g. protein at every meal, two litres of water a day' },
  lifestyle: { name: 'Lifestyle', placeholder: 'e.g. lights out by 23:00, a 10-minute walk after lunch' },
};

const BLOCK_TEXTS: Record<BlockTextKey, TextDescription> = {
  intro: { name: 'Block intro', placeholder: 'What this block is for and how it should feel' },
  note: { name: 'Note for this block', placeholder: 'Anything personal she should know about this block' },
  split: { name: 'Split text', placeholder: 'How her training week is split' },
  missedDay: { name: 'Missed-day note', placeholder: 'What she does when she misses a session' },
};

const GUIDE_TEXTS: Record<GuideTextKey, TextDescription> = {
  legend: { name: 'How to read your session', placeholder: 'One line per term: **Term** — what it means' },
  warmUp: { name: 'Warm-up', placeholder: 'How she warms up before every session' },
  progression: { name: 'How to progress', placeholder: 'When she adds weight or reps' },
  coolDown: { name: 'Cool-down', placeholder: 'How she cools down after a session' },
  noWeight: { name: 'No weight listed', placeholder: 'How she picks a weight when none is listed' },
  lowEnergy: { name: 'Low-energy session', placeholder: 'What she does on a low-energy day' },
  calibration: { name: 'Calibration week', placeholder: 'How the first week of a block works' },
  steps: {
    name: 'Daily steps',
    placeholder: 'Why her daily steps matter',
    hint: '[daily steps] prints as the daily steps target of the block.',
  },
};

const VERSION_FIELDS: Record<Exclude<VersionTextKey, 'whatChanged'>, (content: ProgramContent) => string> = {
  title: content => content.header.title,
  focus: content => content.header.focus,
  personalNote: content => content.header.personalNote,
  nutrition: content => content.nutritionNotes,
  lifestyle: content => content.lifestyleNotes,
};

const NO_TEMPLATE: TemplateText = { text: '', pending: false };
const TITLE_FALLBACK = 'Training program';

export function printedTitle(content: ProgramContent): string {
  return content.header.title.trim() || TITLE_FALLBACK;
}

export function isWritten(text: string): boolean {
  return text.trim() !== '';
}

export function isCustomised(text: ProgramText): boolean {
  return text.standard !== null && text.value !== text.standard;
}

function sessionDays(block: Block): number {
  return Object.values(block.calendar).filter(entry => entry.kind === 'session').length;
}

function blockTemplate(block: Block, key: BlockTextKey, language: ProgramLanguage): TemplateText | null {
  if (key === 'note') return null;
  if (key === 'missedDay') return templateText('missedDay', language);
  if (key === 'intro') return templateText(`block.${block.type}`, language);
  const split = templateText(`split.${block.split.shape}`, language);
  return { ...split, text: fillTemplate(split.text, { days: sessionDays(block) }) };
}

function blockValue(block: Block, key: BlockTextKey): string {
  if (key === 'intro') return block.introText;
  if (key === 'note') return block.clientNote;
  if (key === 'split') return block.split.text;
  return block.missedDayNote;
}

function blockWithValue(block: Block, key: BlockTextKey, text: string): Block {
  if (key === 'intro') return { ...block, introText: text };
  if (key === 'note') return { ...block, clientNote: text };
  if (key === 'split') return { ...block, split: { ...block.split, text } };
  return { ...block, missedDayNote: text };
}

function blockOf(version: ProgramVersion, blockId: string): Block {
  const block = version.content.plan.blocks.find(candidate => candidate.id === blockId);
  if (!block) throw new Error(`No block ${blockId} in version ${version.number}`);
  return block;
}

function versionValue(version: ProgramVersion, key: VersionTextKey): string {
  return key === 'whatChanged' ? version.whatChanged : VERSION_FIELDS[key](version.content);
}

function contentWithValue(content: ProgramContent, key: Exclude<VersionTextKey, 'whatChanged'>, text: string): ProgramContent {
  if (key === 'nutrition') return { ...content, nutritionNotes: text };
  if (key === 'lifestyle') return { ...content, lifestyleNotes: text };
  return { ...content, header: { ...content.header, [key]: text } };
}

export function programText(version: ProgramVersion, target: ProgramTextTarget, language: ProgramLanguage): ProgramText {
  if (target.kind === 'version') {
    return { ...VERSION_TEXTS[target.key], value: versionValue(version, target.key), standard: null, pending: false };
  }
  if (target.kind === 'guide') {
    const template = templateText(target.key, language);
    const value = guideText(version.content.guideTexts, target.key, language);
    return { ...GUIDE_TEXTS[target.key], value, standard: template.text, pending: template.pending };
  }
  const block = blockOf(version, target.blockId);
  const template = blockTemplate(block, target.key, language);
  const { pending } = template ?? NO_TEMPLATE;
  return { ...BLOCK_TEXTS[target.key], value: blockValue(block, target.key), standard: template?.text ?? null, pending };
}

export function versionWithText(version: ProgramVersion, target: ProgramTextTarget, text: string): ProgramVersion {
  const { content } = version;
  if (target.kind === 'version') {
    return target.key === 'whatChanged' ? { ...version, whatChanged: text } : { ...version, content: contentWithValue(content, target.key, text) };
  }
  if (target.kind === 'guide') return { ...version, content: { ...content, guideTexts: withGuideText(content.guideTexts, target.key, text) } };
  const blocks = content.plan.blocks.map(block => (block.id === target.blockId ? blockWithValue(block, target.key, text) : block));
  return { ...version, content: { ...content, plan: { blocks } } };
}

export function versionWithStandardText(version: ProgramVersion, target: ProgramTextTarget, language: ProgramLanguage): ProgramVersion {
  if (target.kind === 'guide') {
    return { ...version, content: { ...version.content, guideTexts: withoutGuideText(version.content.guideTexts, target.key) } };
  }
  const { standard } = programText(version, target, language);
  return standard === null ? version : versionWithText(version, target, standard);
}
