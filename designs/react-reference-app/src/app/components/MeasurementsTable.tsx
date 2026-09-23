import { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Ruler } from 'lucide-react';
import { formatRatio, waistToHeightRatio } from '../domain/bodyMetrics';
import type { MeasurementEntry } from '../domain/journey';
import { formatJourneyDate } from '../utils/journeyLabels';
import { formatBodyWeight, formatCircumference } from '../utils/units';
import type { MeasureUnits } from './client-portal/measureUnits';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { cn } from './ui/utils';

const PANEL_CLASS =
  'rounded-panel border border-border/50 bg-card p-6 shadow-[0_2px_12px_rgb(0,0,0,0.03)]';

const COLUMNS = ['Date', 'Weight', 'Waist', 'Hips', 'Thigh', 'Arm', 'Ratio'];

function newestFirst(measurements: MeasurementEntry[]): MeasurementEntry[] {
  return [...measurements].sort(
    (first, second) => second.recordedAt.getTime() - first.recordedAt.getTime(),
  );
}

function circumference(value: number | undefined, units: MeasureUnits): string {
  return value === undefined ? '—' : formatCircumference(value, units.length);
}

export function MeasurementsTable({
  measurements,
  heightCm,
  units,
  headingId,
  emptyMessage,
  intro,
  className,
  children,
}: {
  measurements: MeasurementEntry[];
  heightCm: number;
  units: MeasureUnits;
  headingId: string;
  emptyMessage: string;
  intro?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const history = newestFirst(measurements);

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(PANEL_CLASS, className)}
      aria-labelledby={headingId}
    >
      <h2
        id={headingId}
        className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold text-text-primary"
      >
        <Ruler size={18} className="text-brand-secondary" aria-hidden="true" />
        Measurements
      </h2>

      {intro}

      {history.length === 0 ? (
        <p className="text-sm text-text-secondary">{emptyMessage}</p>
      ) : (
        <div className="-mx-6 overflow-x-auto">
          <Table>
            <caption className="sr-only">
              Measurements history, newest first
            </caption>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => {
                const ratio = waistToHeightRatio(entry.waistCm, heightCm);

                return (
                  <TableRow key={entry.recordedAt.toISOString()}>
                    <TableCell className="text-sm text-text-primary">
                      {formatJourneyDate(entry.recordedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {formatBodyWeight(entry.weightKg, units.weight)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {circumference(entry.waistCm, units)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {circumference(entry.hipsCm, units)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {circumference(entry.thighCm, units)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {circumference(entry.armCm, units)}
                    </TableCell>
                    <TableCell className="text-sm text-text-primary">
                      {ratio === null ? '—' : formatRatio(ratio)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {children}
    </motion.section>
  );
}
