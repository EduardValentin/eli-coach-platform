import type { Block } from '../../domain/program';
import { fillTemplate } from '../../domain/programTemplates';
import { isWritten } from '../../domain/programTexts';
import { parseTemplate, programTemplate, type TemplateParagraph } from './ProgramText';
import { dailyStepsText, type ProgramView } from './programView';

export type TextPart = { heading: string | null; paragraphs: TemplateParagraph[] };

export type PlacedTexts = {
  plan: { focus: TemplateParagraph[]; note: TemplateParagraph[] };
  blockAndSplit: TextPart[];
  legend: TextPart[];
  lowEnergy: TextPart[];
  warmUp: TextPart[];
  coolDown: TemplateParagraph[];
  restDay: TemplateParagraph[];
  nutrition: TextPart[];
  lifestyle: TextPart[];
};

function part(text: string, fallbackHeading: string | null): TextPart[] {
  if (!isWritten(text)) return [];
  const { title, paragraphs } = parseTemplate(text);
  const opensWithLead = paragraphs[0]?.lead !== undefined;
  return [{ heading: title || (opensWithLead ? null : fallbackHeading), paragraphs }];
}

function paragraphsOf(text: string): TemplateParagraph[] {
  return isWritten(text) ? parseTemplate(text).paragraphs : [];
}

const NO_WEIGHT_TERM = 'No weight listed';
const NO_WEIGHT_QUESTION = /^no weight listed\?\s*/i;

function legendParts(view: ProgramView): TextPart[] {
  const [legend] = part(programTemplate(view, 'legend'), null);
  const noWeight = programTemplate(view, 'noWeight').replace(NO_WEIGHT_QUESTION, '').trim();
  if (noWeight === '') return legend ? [legend] : [];
  const entry: TemplateParagraph = { lead: NO_WEIGHT_TERM, body: noWeight };
  return [{ heading: legend?.heading ?? null, paragraphs: [...(legend?.paragraphs ?? []), entry] }];
}

export function programTextPlacement(view: ProgramView, block: Block): PlacedTexts {
  const { header, nutritionNotes, lifestyleNotes } = view.version.content;
  const steps = fillTemplate(programTemplate(view, 'steps'), { steps: dailyStepsText(block) });
  return {
    plan: { focus: paragraphsOf(header.focus), note: paragraphsOf(header.personalNote) },
    blockAndSplit: [
      ...part(block.introText, 'About this block'),
      ...part(block.clientNote, 'A note from your coach'),
      ...part(block.split.text, 'Your split'),
      ...part(block.missedDayNote, 'If you miss a session'),
      ...part(steps, 'Daily steps'),
    ],
    legend: legendParts(view),
    lowEnergy: part(programTemplate(view, 'lowEnergy'), null),
    warmUp: part(programTemplate(view, 'warmUp'), null),
    coolDown: paragraphsOf(programTemplate(view, 'coolDown')),
    restDay: paragraphsOf(steps),
    nutrition: part(nutritionNotes, null),
    lifestyle: part(lifestyleNotes, null),
  };
}
