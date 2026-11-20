import type { TemplateParagraph } from './ProgramText';

/** The lead-in of a coach's own progression rule, wherever the rule is printed. */
export const CUSTOM_PROGRESSION_LEAD = 'How to progress.';

const OPENING_LEAD_IN = /^([^:?,.]{3,40}[:?,])\s+(.+)$/;
const SENTENCE_END = /[.:?!]$/;
const LEAD_IN_END = /[:,]$/;
const LEAD_WITH_PHRASE = /^([^:]+):\s+(.+)$/;
const TRAILING_MARKS = /[\s:.,]+$/;

/** A bold lead-in's text as a term: "RIR 2:" reads "RIR 2". */
export function leadTerm(paragraph: TemplateParagraph): string {
  return paragraph.lead?.replace(LEAD_IN_END, '') ?? '';
}

/** Lifts a short opening clause, such as "Missed a day?", into the paragraph's lead-in. */
export function withLeadIn(paragraphs: readonly TemplateParagraph[]): TemplateParagraph[] {
  const [first, ...rest] = paragraphs;
  const match = first && first.lead === undefined ? OPENING_LEAD_IN.exec(first.body) : null;
  return match ? [{ lead: match[1], body: match[2] }, ...rest] : [...paragraphs];
}

export function ledBy(lead: string, paragraphs: readonly TemplateParagraph[]): TemplateParagraph[] {
  const [first, ...rest] = paragraphs;
  const sentence = SENTENCE_END.test(lead) ? lead : `${lead}.`;
  if (!first || first.lead !== undefined) return [{ lead: sentence, body: '' }, ...paragraphs];
  return [{ lead: sentence, body: first.body }, ...rest];
}

export type TermRow = { term: string; paragraphs: TemplateParagraph[] };

/** "Warm-up: five minutes" becomes the term "Warm-up" over a body led by "**Five minutes.**". */
export function termRowOf(lead: string, body: string): TermRow {
  const split = LEAD_WITH_PHRASE.exec(lead);
  if (!split) return { term: lead.replace(TRAILING_MARKS, ''), paragraphs: [{ body: body.charAt(0).toUpperCase() + body.slice(1) }] };
  const phrase = `**${split[2].replace(TRAILING_MARKS, '')}.**`;
  return { term: split[1].trim(), paragraphs: [{ body: body ? `${phrase} ${body}` : phrase }] };
}
