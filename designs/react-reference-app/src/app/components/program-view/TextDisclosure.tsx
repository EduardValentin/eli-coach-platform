import { Slot } from '@radix-ui/react-slot';
import { createContext, useContext, useId, useState, type ReactElement, type ReactNode } from 'react';
import { WIDGET_TITLE_CLASS } from '../typography';
import { cn } from '../ui/utils';
import { InlineTextButton } from './InlineTextButton';
import { Emphasised, TemplateBody, type TemplateParagraph } from './ProgramText';
import type { TextPart } from './programTextPlacement';

/** `single` keeps one panel of the group open at a time; `multiple` lets each open on its own. */
type DisclosureType = 'single' | 'multiple';

type GroupState = {
  isOpen: (value: string) => boolean;
  idOf: (value: string, part: 'trigger' | 'panel') => string;
  toggle: (value: string) => void;
};

const GroupContext = createContext<GroupState | null>(null);

function useGroup(): GroupState {
  const group = useContext(GroupContext);
  if (!group) throw new Error('A disclosure needs a TextDisclosureGroup around it.');
  return group;
}

function toggled(open: ReadonlySet<string>, value: string, type: DisclosureType): ReadonlySet<string> {
  if (open.has(value)) return new Set([...open].filter(other => other !== value));
  return type === 'single' ? new Set([value]) : new Set([...open, value]);
}

type TextDisclosureGroupProps = { type?: DisclosureType; children: ReactNode };

export function TextDisclosureGroup({ type = 'single', children }: TextDisclosureGroupProps) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const baseId = useId();

  const group: GroupState = {
    isOpen: value => open.has(value),
    idOf: (value, part) => `${baseId}-${value}-${part}`,
    toggle: value => setOpen(current => toggled(current, value, type)),
  };
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>;
}

export function useDisclosureOpen(value: string): boolean {
  return useGroup().isOpen(value);
}

type DisclosurePartProps = { value: string; children: ReactElement };

/** Gives the caller's button the trigger's id, state and toggle. */
export function DisclosureTrigger({ value, children }: DisclosurePartProps) {
  const group = useGroup();
  const open = group.isOpen(value);
  return (
    <Slot
      id={group.idOf(value, 'trigger')}
      aria-expanded={open}
      aria-controls={open ? group.idOf(value, 'panel') : undefined}
      data-state={open ? 'open' : 'closed'}
      onClick={() => group.toggle(value)}
    >
      {children}
    </Slot>
  );
}

/** The caller's element as the panel its trigger controls, rendered only while open. */
export function DisclosureContent({ value, children }: DisclosurePartProps) {
  const group = useGroup();
  if (!group.isOpen(value)) return null;
  return <Slot id={group.idOf(value, 'panel')}>{children}</Slot>;
}

export function TextDisclosureTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <DisclosureTrigger value={value}>
      <InlineTextButton trailing="disclosure">{children}</InlineTextButton>
    </DisclosureTrigger>
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

type DisclosurePanelProps = { value: string; host?: PanelHost; children: ReactNode };

export function DisclosurePanel({ value, host = 'base', children }: DisclosurePanelProps) {
  const group = useGroup();
  return (
    <DisclosureContent value={value}>
      <section
        aria-labelledby={group.idOf(value, 'trigger')}
        data-parity="text-panel"
        className={cn('border-y border-border-subtle p-4 @3xl:px-6 @3xl:py-5', PANEL_SURFACE_CLASS[host])}
      >
        {children}
      </section>
    </DisclosureContent>
  );
}

type TextDisclosurePanelProps = { value: string; parts: readonly TextPart[]; headingLevel: HeadingLevel; host?: PanelHost };

export function TextDisclosurePanel({ value, parts, headingLevel, host }: TextDisclosurePanelProps) {
  if (parts.length === 0) return null;
  return (
    <DisclosurePanel value={value} host={host}>
      <TextParts parts={parts} headingLevel={headingLevel} />
    </DisclosurePanel>
  );
}
