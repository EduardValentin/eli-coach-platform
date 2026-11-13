import type { ProgramContent, ProgramLanguage } from '../../../domain/program';
import { guideText, templateText, withGuideText, withoutGuideText, type GuideTextKey } from '../../../domain/programTemplates';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { LABEL_CLASS } from '../../typography';
import { TextCardStack, type TextCard } from '../../program-view/ProgramText';
import { ClientTextEditor } from './ClientTextEditor';

type GuideEntry = { key: GuideTextKey; title: string; where: string; hint?: string };
type GuideGroup = { title: string; entries: GuideEntry[] };

const GUIDE_GROUPS: GuideGroup[] = [
  {
    title: 'Reading the sessions',
    entries: [
      { key: 'legend', title: 'How to read your session', where: 'Program page and PDF, before the sessions.' },
      { key: 'warmUp', title: 'Warm-up', where: 'PDF, in the “Every session” box.' },
      { key: 'progression', title: 'How to progress', where: 'Under every exercise that uses double progression, and in the PDF.' },
      { key: 'coolDown', title: 'Cool-down', where: 'PDF, when a session has a cool-down.' },
      { key: 'noWeight', title: 'No weight listed', where: 'PDF, in the “Every session” box.' },
    ],
  },
  {
    title: 'Day by day',
    entries: [
      { key: 'lowEnergy', title: 'Low-energy session', where: 'Under every training day, and in the PDF.' },
      { key: 'hiitAside', title: 'Hard cardio swap', where: 'Under cardio days with hard intervals.' },
      { key: 'restDay', title: 'Rest day', where: 'On rest days.' },
    ],
  },
  {
    title: 'Block and week',
    entries: [
      { key: 'calibration', title: 'Calibration week', where: 'About this block, while a block runs its calibration week.' },
      {
        key: 'steps',
        title: 'Daily steps',
        where: 'Cardio and steps.',
        hint: '[daily steps] is replaced by the daily steps target of the current block.',
      },
    ],
  },
];

type ClientGuideSectionProps = { content: ProgramContent; language: ProgramLanguage; onChange: (content: ProgramContent) => void };

export function ClientGuideSection({ content, language, onChange }: ClientGuideSectionProps) {
  const write = (key: GuideTextKey, text: string) => onChange({ ...content, guideTexts: withGuideText(content.guideTexts, key, text) });
  const reset = (key: GuideTextKey) => onChange({ ...content, guideTexts: withoutGuideText(content.guideTexts, key) });
  const card = (entry: GuideEntry): TextCard => ({
    key: entry.key,
    title: entry.title,
    content: (
      <ClientTextEditor
        label={entry.title}
        value={guideText(content.guideTexts, entry.key, language)}
        template={templateText(entry.key, language)}
        caption={[`Shown: ${entry.where}`, entry.hint].filter(Boolean).join(' ')}
        onChange={text => write(entry.key, text)}
        onReset={() => reset(entry.key)}
      />
    ),
  });

  return (
    <SettingsSection
      headingId="guide-heading"
      title="Client guide"
      description="Standard explanations every client reads alongside her program."
    >
      <SettingsBody className="grid gap-6">
        {GUIDE_GROUPS.map(group => (
          <section key={group.title} aria-label={group.title} className="grid gap-2">
            <h3 className={LABEL_CLASS}>{group.title}</h3>
            <TextCardStack cards={group.entries.map(card)} />
          </section>
        ))}
      </SettingsBody>
    </SettingsSection>
  );
}
