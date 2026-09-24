import { type ReactNode } from 'react';
import { Ruler } from 'lucide-react';
import { formatRatio, waistToHeightRatio } from '../domain/bodyMetrics';
import type { MeasurementEntry } from '../domain/journey';
import { formatJourneyDate } from '../utils/journeyLabels';
import { formatBodyWeight, formatCircumference } from '../utils/units';
import type { MeasureUnits } from './client-portal/measureUnits';
import { PortalWidget, type WidgetPresentation } from './PortalWidget';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

export type MeasurementsPerspective = WidgetPresentation;

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
  perspective = 'coach',
}: {
  measurements: MeasurementEntry[];
  heightCm: number;
  units: MeasureUnits;
  headingId: string;
  emptyMessage: string;
  intro?: ReactNode;
  className?: string;
  children?: ReactNode;
  perspective?: MeasurementsPerspective;
}) {
  const history = newestFirst(measurements);

  return (
    <PortalWidget
      presentation={perspective}
      title="Measurements"
      icon={
        <Ruler aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId={headingId}
      className={className}
    >
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
    </PortalWidget>
  );
}
