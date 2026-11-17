import { planHasCoolDown, type Block, type ProgramContent, type ProgramLanguage, type ProgramVersion } from './program';
import { fillTemplate, guideText, templateText, withGuideText, withoutGuideText, type GuideTextKey, type TemplateText } from './programTemplates';

export type VersionTextKey = 'title' | 'focus' | 'personalNote' | 'whatChanged' | 'nutrition' | 'lifestyle';
export type BlockTextKey = 'intro' | 'note' | 'split' | 'missedDay';

export type ProgramTextTarget =
  | { kind: 'version'; key: VersionTextKey }
  | { kind: 'guide'; key: GuideTextKey }
  | { kind: 'block'; blockId: string; key: BlockTextKey };

export type TextFormatting = 'plain' | 'paragraphs' | 'titled';

type TextDescription = { name: string; placeholder: string; formatting: TextFormatting; optional: boolean };

export type ProgramText = TextDescription & {
  value: string;
  standard: string | null;
  pending: boolean;
};

const VERSION_TEXTS: Record<VersionTextKey, TextDescription> = {
  title: { name: 'Program title', placeholder: 'Her training program', formatting: 'plain', optional: true },
  focus: { name: 'Focus until the next check-in', placeholder: 'What she concentrates on until her next check-in form', formatting: 'plain', optional: true },
  personalNote: { name: 'Note from Eli', placeholder: 'A few words from you to open her program', formatting: 'paragraphs', optional: true },
  whatChanged: { name: 'What changed and why', placeholder: 'What you changed in this version, and why', formatting: 'paragraphs', optional: false },
  nutrition: { name: 'Nutrition', placeholder: 'e.g. protein at every meal, two litres of water a day', formatting: 'titled', optional: true },
  lifestyle: { name: 'Lifestyle', placeholder: 'e.g. lights out by 23:00, a 10-minute walk after lunch', formatting: 'titled', optional: true },
};

const BLOCK_TEXTS: Record<BlockTextKey, TextDescription> = {
  intro: { name: 'Block intro', placeholder: 'What this block is for and how it should feel', formatting: 'titled', optional: false },
  note: { name: 'Note for this block', placeholder: 'Anything personal she should know about this block', formatting: 'paragraphs', optional: true },
  split: { name: 'Split text', placeholder: 'How her training week is split', formatting: 'titled', optional: false },
  missedDay: { name: 'Missed-day note', placeholder: 'What she does when she misses a session', formatting: 'paragraphs', optional: false },
};

const GUIDE_TEXTS: Record<GuideTextKey, TextDescription> = {
  legend: { name: 'How to read your session', placeholder: 'One line per term: the term in bold, then what it means', formatting: 'titled', optional: false },
  warmUp: { name: 'Warm-up', placeholder: 'How she warms up before every session', formatting: 'titled', optional: false },
  progression: { name: 'How to progress', placeholder: 'When she adds weight or reps', formatting: 'paragraphs', optional: false },
  coolDown: { name: 'Cool-down', placeholder: 'How she cools down after a session', formatting: 'paragraphs', optional: false },
  noWeight: { name: 'No weight listed', placeholder: 'How she picks a weight when none is listed', formatting: 'plain', optional: false },
  lowEnergy: { name: 'Low-energy session', placeholder: 'What she does on a low-energy day', formatting: 'titled', optional: false },
  calibration: { name: 'Calibration week', placeholder: 'How the first week of a block works', formatting: 'paragraphs', optional: false },
  steps: { name: 'Daily steps', placeholder: 'Why her daily steps matter', formatting: 'titled', optional: false },
};

const VERSION_FIELDS: Record<Exclude<VersionTextKey, 'whatChanged'>, (content: ProgramContent) => string> = {
  title: content => content.header.title,
  focus: content => content.header.focus,
  personalNote: content => content.header.personalNote,
  nutrition: content => content.nutritionNotes,
  lifestyle: content => content.lifestyleNotes,
};

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

function usesFallback(value: string, template: TemplateText): boolean {
  return template.pending && isWritten(value) && value === template.text;
}

export function programText(version: ProgramVersion, target: ProgramTextTarget, language: ProgramLanguage): ProgramText {
  if (target.kind === 'version') {
    return { ...VERSION_TEXTS[target.key], value: versionValue(version, target.key), standard: null, pending: false };
  }
  if (target.kind === 'guide') {
    const template = templateText(target.key, language);
    const value = guideText(version.content.guideTexts, target.key, language);
    return { ...GUIDE_TEXTS[target.key], value, standard: template.text, pending: usesFallback(value, template) };
  }
  const block = blockOf(version, target.blockId);
  const template = blockTemplate(block, target.key, language);
  const value = blockValue(block, target.key);
  return { ...BLOCK_TEXTS[target.key], value, standard: template?.text ?? null, pending: template !== null && usesFallback(value, template) };
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

export type TextProgress = { toWrite: number; pending: number };

function versionText(key: VersionTextKey): ProgramTextTarget {
  return { kind: 'version', key };
}

function guideTarget(key: GuideTextKey): ProgramTextTarget {
  return { kind: 'guide', key };
}

export function programWideTexts(version: ProgramVersion): ProgramTextTarget[] {
  const whatChanged = version.number > 1 ? [versionText('whatChanged')] : [];
  const anyCoolDown = planHasCoolDown(version.content.plan.blocks);
  return [
    versionText('title'),
    versionText('focus'),
    versionText('personalNote'),
    ...whatChanged,
    guideTarget('legend'),
    guideTarget('noWeight'),
    guideTarget('warmUp'),
    guideTarget('progression'),
    ...(anyCoolDown ? [guideTarget('coolDown')] : []),
    guideTarget('lowEnergy'),
    versionText('nutrition'),
    versionText('lifestyle'),
  ];
}

export function blockTexts(block: Block): ProgramTextTarget[] {
  const own = (key: BlockTextKey): ProgramTextTarget => ({ kind: 'block', blockId: block.id, key });
  return [
    own('intro'),
    own('note'),
    ...(block.calibrationWeek ? [guideTarget('calibration')] : []),
    own('split'),
    own('missedDay'),
    guideTarget('steps'),
  ];
}

export function textProgress(version: ProgramVersion, targets: readonly ProgramTextTarget[], language: ProgramLanguage): TextProgress {
  const texts = targets.map(target => programText(version, target, language));
  return {
    toWrite: texts.filter(text => !text.optional && !isWritten(text.value)).length,
    pending: texts.filter(text => text.pending).length,
  };
}
