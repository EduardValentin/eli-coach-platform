import { useId } from 'react';
import { SettingsRow, SettingsRows, SettingsSection } from '../../SettingsSection';
import { Textarea } from '../../ui/textarea';

type LifestyleSectionProps = { notes: string; onChange: (notes: string) => void };

export function LifestyleSection({ notes, onChange }: LifestyleSectionProps) {
  const id = useId();
  return (
    <SettingsSection headingId="lifestyle-heading" title="Lifestyle">
      <SettingsRows>
        <SettingsRow htmlFor={id} title="Lifestyle guidance" hint="Sleep, stress, what to track until the next check-in form" layout="stacked">
          <Textarea id={id} value={notes} onChange={event => onChange(event.target.value)} />
        </SettingsRow>
      </SettingsRows>
    </SettingsSection>
  );
}
