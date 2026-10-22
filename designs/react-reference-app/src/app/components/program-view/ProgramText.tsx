import { templateText, type TemplateKey } from '../../domain/programTemplates';
import { plainText, type ProgramView } from './programView';

export const NUTRITION_FALLBACK = 'Your coach will add nutrition guidance here.';
export const LIFESTYLE_FALLBACK = 'Nothing extra this time.';

export function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid gap-3 text-sm leading-relaxed text-text-primary">
      {nonEmptyLines(plainText(text)).map((line, index) => (
        <p key={index}>{line}</p>
      ))}
    </div>
  );
}

export function template(view: ProgramView, key: TemplateKey): string {
  return templateText(key, view.program.language).text;
}

const HEADING_LINE = /^\*\*([^*]+)\*\*$/;
const EMPHASIS = /(\*\*[^*]+\*\*|\*[^*]+\*)/;

export type HeadedText = { heading: string | null; body: string };

export function headedText(text: string): HeadedText {
  const [first = '', ...rest] = text.trim().split('\n');
  const match = HEADING_LINE.exec(first.trim());
  if (!match) return { heading: null, body: text };
  return { heading: match[1], body: rest.join('\n') };
}

export function Emphasised({ text }: { text: string }) {
  return text.split(EMPHASIS).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  });
}

export function nonEmptyLines(text: string): string[] {
  return text.split('\n').filter(line => line.trim() !== '');
}
