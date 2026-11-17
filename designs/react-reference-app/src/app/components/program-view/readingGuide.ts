import { leadTerm } from './leadIns';
import { parseTemplate, type TemplateParagraph } from './ProgramText';

const RIR_TERM = /^RIR\s+(\d+)(?:\s*[–-]\s*(\d+))?$/;

export const NO_WEIGHT_TERM = 'No weight listed';
export const WARM_UP_SET_TERM = 'Warm-up set';
const WARM_UP_SET_TEXT = 'Lighter, to build up to your working weight.';

export function rirTermRange(term: string): { min: number; max: number } | null {
  const match = RIR_TERM.exec(term);
  if (!match) return null;
  const min = Number(match[1]);
  return { min, max: match[2] === undefined ? min : Number(match[2]) };
}

/** `on-rir`: the no-weight text closes the RIR row, since RIR is what chooses a weight the coach left out. */
type NoWeightRow = 'on-rir' | 'own-row' | 'none';

/** `editing` keeps every coach text in its own row, so each can be edited where it stands. */
type GuideReading = 'reading' | 'editing';

export type ReadingGuide = {
  title: string;
  legend: TemplateParagraph[];
  noWeight: { row: NoWeightRow; text: string };
  warmUpSet: TemplateParagraph;
};

function noWeightRowOf(paragraphs: readonly TemplateParagraph[], note: string, reading: GuideReading): NoWeightRow {
  if (reading === 'editing') return 'own-row';
  if (!note) return 'none';
  return paragraphs.some(paragraph => rirTermRange(leadTerm(paragraph)) !== null) ? 'on-rir' : 'own-row';
}

/** The rows that explain a session, shared by the viewer's "How to read this" and the document's reading guide. */
export function readingGuide(texts: { legend: string; noWeight: string }, reading: GuideReading): ReadingGuide {
  const { title, paragraphs } = parseTemplate(texts.legend);
  const note = texts.noWeight.trim();
  const row = noWeightRowOf(paragraphs, note, reading);
  return {
    title,
    legend: row === 'on-rir' ? paragraphs.map(paragraph => (rirTermRange(leadTerm(paragraph)) ? { ...paragraph, body: `${paragraph.body} ${note}` } : paragraph)) : paragraphs,
    noWeight: { row, text: note },
    warmUpSet: { lead: WARM_UP_SET_TERM, body: WARM_UP_SET_TEXT },
  };
}

export function guideRows(guide: ReadingGuide): TemplateParagraph[] {
  const noWeight = guide.noWeight.row === 'own-row' ? [{ lead: NO_WEIGHT_TERM, body: guide.noWeight.text }] : [];
  return [...guide.legend, ...noWeight, guide.warmUpSet];
}
