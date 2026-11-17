import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { WIDGET_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { InlineTextButton } from './InlineTextButton';
import { Emphasised, TemplateBody, type TemplateParagraph } from './ProgramText';
import type { TextPart } from './programTextPlacement';

type GroupState = {
  openValue: string | null;
  idOf: (value: string, part: 'trigger' | 'panel') => string;
  toggle: (value: string) => void;
};

const GroupContext = createContext<GroupState | null>(null);

function useGroup(): GroupState {
  const group = useContext(GroupContext);
  if (!group) throw new Error('A text disclosure needs a TextDisclosureGroup around it.');
  return group;
}

export function TextDisclosureGroup({ children }: { children: ReactNode }) {
  const [openValue, setOpenValue] = useState<string | null>(null);
  const baseId = useId();

  const group: GroupState = {
    openValue,
    idOf: (value, part) => `${baseId}-${value}-${part}`,
    toggle: value => setOpenValue(current => (current === value ? null : value)),
  };
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>;
}

type TriggerSize = 'sm' | 'lg';

type TextDisclosureTriggerProps = { value: string; size?: TriggerSize; children: ReactNode };

export function TextDisclosureTrigger({ value, size = 'sm', children }: TextDisclosureTriggerProps) {
  const group = useGroup();
  const open = group.openValue === value;
  return (
    <InlineTextButton
      id={group.idOf(value, 'trigger')}
      aria-expanded={open}
      aria-controls={open ? group.idOf(value, 'panel') : undefined}
      size={size}
      trailing="disclosure"
      onClick={() => group.toggle(value)}
    >
      {children}
    </InlineTextButton>
  );
}

type HeadingLevel = 'h3' | 'h4';

function isTermList(paragraphs: readonly TemplateParagraph[]): boolean {
  return paragraphs.length > 1 && paragraphs.every(paragraph => paragraph.lead !== undefined);
}

const TERM_DASH = /^—\s+/;

function TermList({ paragraphs }: { paragraphs: readonly TemplateParagraph[] }) {
  return (
    <dl className="max-w-xl divide-y divide-border-subtle text-base">
      {paragraphs.map(paragraph => (
        <div key={paragraph.lead} className="grid gap-0.5 py-2.5 first:pt-0 last:pb-0">
          <dt className="font-semibold text-text-primary">{paragraph.lead}</dt>
          <dd className="text-text-primary">
            <Emphasised text={paragraph.body.replace(TERM_DASH, '')} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function TextParts({ parts, headingLevel }: { parts: readonly TextPart[]; headingLevel: HeadingLevel }) {
  const Heading = headingLevel;
  return (
    <div className="grid max-w-xl gap-5">
      {parts.map((part, index) => (
        <div key={part.heading ?? index} className="grid gap-2">
          {part.heading && <Heading className={WIDGET_TITLE_CLASS}>{part.heading}</Heading>}
          {isTermList(part.paragraphs) ? <TermList paragraphs={part.paragraphs} /> : <TemplateBody paragraphs={part.paragraphs} className="text-base" />}
        </div>
      ))}
    </div>
  );
}

type PanelHost = 'base' | 'subtle';

const PANEL_SURFACE_CLASS: Record<PanelHost, string> = { base: 'bg-surface-subtle', subtle: 'bg-surface-base' };

type TextDisclosurePanelProps = { value: string; parts: readonly TextPart[]; headingLevel: HeadingLevel; host?: PanelHost };

export function TextDisclosurePanel({ value, parts, headingLevel, host = 'base' }: TextDisclosurePanelProps) {
  const group = useGroup();
  if (group.openValue !== value || parts.length === 0) return null;
  return (
    <section
      id={group.idOf(value, 'panel')}
      aria-labelledby={group.idOf(value, 'trigger')}
      data-parity="text-panel"
      className={cn('border-y border-border-subtle p-4 @3xl:px-6 @3xl:py-5', PANEL_SURFACE_CLASS[host])}
    >
      <TextParts parts={parts} headingLevel={headingLevel} />
    </section>
  );
}
