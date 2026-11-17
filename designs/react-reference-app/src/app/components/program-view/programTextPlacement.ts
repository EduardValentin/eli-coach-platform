import type { Block } from '../../domain/program';
import { isWritten } from '../../domain/programTexts';
import { parseTemplate, programTemplate, type TemplateParagraph } from './ProgramText';
import type { ProgramView } from './programView';
import { guideRows, readingGuide } from './readingGuide';

export type TextPart = { heading: string | null; paragraphs: TemplateParagraph[] };

export type PlacedTexts = {
  plan: { focus: TemplateParagraph[]; note: TemplateParagraph[] };
  blockAndSplit: TextPart[];
  legend: TextPart[];
  lowEnergy: TextPart[];
  warmUp: TextPart[];
  coolDown: TemplateParagraph[];
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

function legendParts(view: ProgramView): TextPart[] {
  const legend = programTemplate(view, 'legend');
  const noWeight = programTemplate(view, 'noWeight');
  if (!isWritten(legend) && !isWritten(noWeight)) return [];
  const guide = readingGuide({ legend, noWeight }, 'reading');
  return [{ heading: guide.title || null, paragraphs: guideRows(guide) }];
}

export function programTextPlacement(view: ProgramView, block: Block): PlacedTexts {
  const { header, nutritionNotes, lifestyleNotes } = view.version.content;
  const steps = programTemplate(view, 'steps');
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
    nutrition: part(nutritionNotes, null),
    lifestyle: part(lifestyleNotes, null),
  };
}
