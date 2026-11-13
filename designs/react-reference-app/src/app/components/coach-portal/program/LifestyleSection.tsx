import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { Textarea } from '../../ui/textarea';

type LifestyleSectionProps = { notes: string; onChange: (notes: string) => void };

export function LifestyleSection({ notes, onChange }: LifestyleSectionProps) {
  return (
    <SettingsSection headingId="lifestyle-heading" title="Lifestyle">
      <SettingsBody>
        <Textarea
          aria-label="Lifestyle guidance"
          placeholder="e.g. lights out by 23:00, a 10-minute walk after lunch"
          value={notes}
          onChange={event => onChange(event.target.value)}
        />
      </SettingsBody>
    </SettingsSection>
  );
}
