import { Utensils } from 'lucide-react';
import { EmptyState } from '../../EmptyState';
import { SettingsBody, SettingsSection } from '../../SettingsSection';
import { Textarea } from '../../ui/textarea';

type NutritionSectionProps = { notes: string; onChange: (notes: string) => void };

export function NutritionSection({ notes, onChange }: NutritionSectionProps) {
  return (
    <SettingsSection headingId="nutrition-heading" title="Nutrition">
      <EmptyState icon={Utensils} title="Meal plan — designed in the next round" />
      <SettingsBody>
        <Textarea
          aria-label="Nutrition guidance"
          placeholder="e.g. protein at every meal, two litres of water a day"
          value={notes}
          onChange={event => onChange(event.target.value)}
        />
      </SettingsBody>
    </SettingsSection>
  );
}
