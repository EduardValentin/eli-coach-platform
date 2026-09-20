import { motion } from 'motion/react';
import { Ruler } from 'lucide-react';
import { formatRatio, waistToHeightRatio } from '../../domain/bodyMetrics';
import type { MeasurementEntry } from '../../domain/journey';
import { formatJourneyDate } from '../../utils/journeyLabels';

const PANEL_CLASS =
  'bg-white p-6 rounded-panel shadow-[0_2px_12px_rgb(0,0,0,0.03)] border border-neutral-100/50';

const HEAD_CELL_CLASS =
  'py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-text-secondary';

const CELL_CLASS = 'py-3 px-4 text-sm text-text-primary';

const COLUMNS = ['Date', 'Weight', 'Waist', 'Hips', 'Thigh', 'Arm', 'Ratio'];

function centimetres(value: number | undefined): string {
  return value === undefined ? '—' : `${value} cm`;
}

export function MeasurementsTable({
  measurements,
  heightCm,
}: {
  measurements: MeasurementEntry[];
  heightCm: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${PANEL_CLASS} mb-8`}
      aria-labelledby="measurements-panel-heading"
    >
      <h2
        id="measurements-panel-heading"
        className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
      >
        <Ruler size={18} className="text-brand-secondary" aria-hidden="true" />
        Measurements
      </h2>

      {measurements.length === 0 ? (
        <p className="text-sm text-text-secondary">
          She has not sent any measurements yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Measurements history, newest last
            </caption>
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50/50">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className={HEAD_CELL_CLASS}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {measurements.map((entry) => {
                const ratio = waistToHeightRatio(entry.waistCm, heightCm);

                return (
                  <tr
                    key={entry.recordedAt.toISOString()}
                    className="border-b border-neutral-50"
                  >
                    <td className={CELL_CLASS}>
                      {formatJourneyDate(entry.recordedAt)}
                    </td>
                    <td className={CELL_CLASS}>{entry.weightKg} kg</td>
                    <td className={CELL_CLASS}>{centimetres(entry.waistCm)}</td>
                    <td className={CELL_CLASS}>{centimetres(entry.hipsCm)}</td>
                    <td className={CELL_CLASS}>{centimetres(entry.thighCm)}</td>
                    <td className={CELL_CLASS}>{centimetres(entry.armCm)}</td>
                    <td className={CELL_CLASS}>
                      {ratio === null ? '—' : formatRatio(ratio)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}
