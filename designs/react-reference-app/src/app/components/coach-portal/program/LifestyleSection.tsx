import { useId } from 'react';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { Textarea } from '../../ui/textarea';

type LifestyleSectionProps = { notes: string; onChange: (notes: string) => void };

export function LifestyleSection({ notes, onChange }: LifestyleSectionProps) {
  const id = useId();
  return (
    <SettingsSection headingId="lifestyle-heading" title="Lifestyle">
      <SettingsRows>
        <SettingsRow htmlFor={id} title="Lifestyle guidance" layout="stacked">
          <Textarea id={id} placeholder="e.g. lights out by 23:00, a 10-minute walk after lunch" value={notes} onChange={event => onChange(event.target.value)} />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
