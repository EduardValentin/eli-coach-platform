import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Scale, Ruler } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { useUnitPreferences } from '../context/UnitPreferencesContext';
import { formatBodyWeight, formatHeight } from '../utils/units';
import type { WeightUnit, HeightUnit } from '../utils/units';

const ITEM_CLASS =
  'h-11 px-4 text-sm font-semibold text-muted-foreground data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:border-brand data-[state=on]:hover:bg-brand data-[state=on]:hover:text-brand-foreground';

interface UnitPreferencesSettingsProps {
  /** Sample weight (kg) used only for the preview text; defaults to a neutral sample. */
  sampleWeightKg?: number;
  /** Sample height (cm) used only for the preview text; defaults to a neutral sample. */
  sampleHeightCm?: number;
}

export function UnitPreferencesSettings({ sampleWeightKg = 66.1, sampleHeightCm = 165 }: UnitPreferencesSettingsProps) {
  const { weightUnit, heightUnit, setWeightUnit, setHeightUnit } = useUnitPreferences();

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-labelledby="units-heading"
      className="bg-card rounded-3xl border border-border overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 border-b border-border rounded-md">
        <h2 id="units-heading" className="font-serif text-lg font-semibold text-foreground">Units &amp; Measurements</h2>
      </div>

      <div className="divide-y divide-border">
        <SettingRow
          icon={<Scale size={18} className="text-brand" aria-hidden="true" />}
          labelId="weight-unit-label"
          title="Body weight & loads"
          description="Used for weight, training loads, and workout volume."
          preview={`e.g. ${formatBodyWeight(sampleWeightKg, weightUnit)}`}
        >
          <ToggleGroup
            type="single"
            value={weightUnit}
            onValueChange={(v) => { if (v) setWeightUnit(v as WeightUnit); }}
            variant="outline"
            aria-labelledby="weight-unit-label"
            className="w-full max-w-[240px]"
          >
            <ToggleGroupItem value="kg" aria-label="Kilograms" className={ITEM_CLASS}>kg</ToggleGroupItem>
            <ToggleGroupItem value="lb" aria-label="Pounds" className={ITEM_CLASS}>lb</ToggleGroupItem>
          </ToggleGroup>
        </SettingRow>

        <SettingRow
          icon={<Ruler size={18} className="text-brand-secondary" aria-hidden="true" />}
          labelId="height-unit-label"
          title="Height"
          description="Used wherever height is shown."
          preview={`e.g. ${formatHeight(sampleHeightCm, heightUnit)}`}
        >
          <ToggleGroup
            type="single"
            value={heightUnit}
            onValueChange={(v) => { if (v) setHeightUnit(v as HeightUnit); }}
            variant="outline"
            aria-labelledby="height-unit-label"
            className="w-full max-w-[240px]"
          >
            <ToggleGroupItem value="cm" aria-label="Centimetres" className={ITEM_CLASS}>cm</ToggleGroupItem>
            <ToggleGroupItem value="ft-in" aria-label="Feet and inches" className={ITEM_CLASS}>ft·in</ToggleGroupItem>
          </ToggleGroup>
        </SettingRow>
      </div>
    </motion.section>
  );
}

function SettingRow({
  icon, labelId, title, description, preview, children,
}: {
  icon: ReactNode;
  labelId: string;
  title: string;
  description: string;
  preview: string;
  children: ReactNode;
}) {
  return (
    <div className="px-5 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <p id={labelId} className="font-semibold text-sm text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">{preview}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
