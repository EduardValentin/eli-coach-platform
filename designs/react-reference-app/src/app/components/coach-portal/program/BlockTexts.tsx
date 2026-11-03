import type { Block, Program } from '../../../domain/program';
import { fillTemplate, templateText, type TemplateKey } from '../../../domain/programTemplates';
import { CollapsiblePortalWidget } from '../../CollapsiblePortalWidget';
import { parseTemplate, TextCardStack, type TextCard } from '../../program-view/ProgramText';
import { ClientTextEditor } from './ClientTextEditor';

type BlockTextsProps = { block: Block; language: Program['language']; onChange: (block: Block) => void };

type TextField = {
  label: string;
  templateKey: (block: Block) => TemplateKey | null;
  read: (block: Block) => string;
  write: (block: Block, text: string) => Block;
};

function sessionDays(block: Block): number {
  return Object.values(block.calendar).filter(entry => entry.kind === 'session').length;
}

const FIELDS: TextField[] = [
  {
    label: 'Intro',
    templateKey: block => `block.${block.type}`,
    read: block => block.introText,
    write: (block, introText) => ({ ...block, introText }),
  },
  {
    label: 'Client note',
    templateKey: () => null,
    read: block => block.clientNote,
    write: (block, clientNote) => ({ ...block, clientNote }),
  },
  {
    label: 'Split text',
    templateKey: block => `split.${block.split.shape}`,
    read: block => block.split.text,
    write: (block, text) => ({ ...block, split: { ...block.split, text } }),
  },
  {
    label: 'Missed-day note',
    templateKey: () => 'missedDay',
    read: block => block.missedDayNote,
    write: (block, missedDayNote) => ({ ...block, missedDayNote }),
  },
];

function fieldTemplate(field: TextField, block: Block, language: Program['language']) {
  const key = field.templateKey(block);
  const template = key ? templateText(key, language) : { text: '', pending: false };
  return { ...template, text: fillTemplate(template.text, { days: sessionDays(block) }) };
}

function TextFieldEditor({ field, block, language, onChange }: BlockTextsProps & { field: TextField }) {
  const template = fieldTemplate(field, block, language);
  return (
    <ClientTextEditor
      label={field.label}
      value={field.read(block)}
      template={template}
      onChange={text => onChange(field.write(block, text))}
      onReset={() => onChange(field.write(block, template.text))}
    />
  );
}

function fieldCard(field: TextField, props: BlockTextsProps): TextCard {
  const templateTitle = parseTemplate(fieldTemplate(field, props.block, props.language).text).title;
  return {
    key: field.label,
    title: templateTitle || field.label,
    eyebrow: templateTitle ? field.label : undefined,
    content: <TextFieldEditor field={field} {...props} />,
  };
}

export function BlockTexts(props: BlockTextsProps) {
  return (
    <CollapsiblePortalWidget title="Texts the client reads" headingId={`block-texts-${props.block.id}`}>
      <TextCardStack cards={FIELDS.map(field => fieldCard(field, props))} />
    </CollapsiblePortalWidget>
  );
}
