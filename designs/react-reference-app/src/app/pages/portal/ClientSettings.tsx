import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Scale, Ruler } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group';
import { useUnitPreferences } from '../../context/UnitPreferencesContext';
import { useClientProfile } from '../../context/ClientProfileContext';
import { formatBodyWeight, formatHeight } from '../../utils/units';
import type { WeightUnit, HeightUnit } from '../../utils/units';

const ITEM_CLASS =
  'h-11 px-4 text-sm font-semibold text-neutral-600 data-[state=on]:bg-[#C81D6B] data-[state=on]:text-white data-[state=on]:border-[#C81D6B] data-[state=on]:hover:bg-[#C81D6B] data-[state=on]:hover:text-white';

export function ClientSettings() {
  const { weightUnit, heightUnit, setWeightUnit, setHeightUnit } = useUnitPreferences();
  const { clientProfile } = useClientProfile();

  const sampleWeightKg = clientProfile?.currentWeightKg ?? 66.1;
  const sampleHeightCm = clientProfile?.heightCm ?? 165;

  return (
    <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8 pb-12">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#121212] leading-tight">Settings</h1>
        <p className="text-sm text-neutral-500">Choose how your measurements are shown across the app.</p>
      </header>

      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        aria-labelledby="units-heading"
        className="bg-white rounded-3xl border border-neutral-200 overflow-hidden"
      >
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100">
          <h2 id="units-heading" className="font-serif text-lg font-semibold text-[#121212]">Units &amp; Measurements</h2>
        </div>

        <div className="divide-y divide-neutral-100">
          <SettingRow
            icon={<Scale size={18} className="text-[#C81D6B]" aria-hidden="true" />}
            labelId="weight-unit-label"
            title="Body weight & loads"
            description="Used for your weight, training loads, and workout volume."
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
            icon={<Ruler size={18} className="text-[#00796B]" aria-hidden="true" />}
            labelId="height-unit-label"
            title="Height"
            description="Used wherever your height is shown."
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

      <p className="text-xs text-neutral-400 px-1">Preferences are saved to this device.</p>
    </div>
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
        <span className="w-9 h-9 rounded-xl bg-neutral-50 flex items-center justify-center shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <p id={labelId} className="font-semibold text-sm text-[#121212]">{title}</p>
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
          <p className="text-xs text-neutral-400 mt-1 tabular-nums">{preview}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
