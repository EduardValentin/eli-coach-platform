import { type ReactNode } from 'react';
import { Ruler } from 'lucide-react';
import { formatRatio, waistToHeightRatio } from '../domain/bodyMetrics';
import { hasProgressPhotos, type MeasurementEntry } from '../domain/journey';
import { formatJourneyDate } from '../utils/journeyLabels';
import { formatBodyWeight, formatCircumference } from '../utils/units';
import type { MeasureUnits } from './client-portal/measureUnits';
import { PortalWidget } from './PortalWidget';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const VALUE_COLUMNS = ['Date', 'Weight', 'Waist', 'Hips', 'Thigh', 'Arm'];

const VALUE_CELL_CLASS = 'text-sm text-text-primary';

type CoachRatioBasis = { heightCm: number; ratioHidden?: boolean };

type MeasurementsPerspectiveProps =
  | { perspective: 'client' }
  | ({ perspective: 'coach' } & CoachRatioBasis);

type MeasurementsTableProps = MeasurementsPerspectiveProps & {
  measurements: MeasurementEntry[];
  units: MeasureUnits;
  headingId: string;
  emptyMessage: string;
  intro?: ReactNode;
  action?: ReactNode;
  emptyAction?: ReactNode;
  className?: string;
  children?: ReactNode;
  onViewPhotos?: (entry: MeasurementEntry) => void;
};

function newestFirst(measurements: MeasurementEntry[]): MeasurementEntry[] {
  return [...measurements].sort(
    (first, second) => second.recordedAt.getTime() - first.recordedAt.getTime(),
  );
}

function circumference(value: number | undefined, units: MeasureUnits): string {
  return value === undefined ? '—' : formatCircumference(value, units.length);
}

function coachRatio(entry: MeasurementEntry, basis: CoachRatioBasis): string {
  if (basis.ratioHidden) return '—';

  const ratio = waistToHeightRatio(entry.waistCm, basis.heightCm);

  return ratio === null ? '—' : formatRatio(ratio);
}

export function MeasurementsTable(props: MeasurementsTableProps) {
  const {
    measurements,
    units,
    headingId,
    emptyMessage,
    intro,
    action,
    emptyAction,
    className,
    children,
    onViewPhotos,
  } = props;
  const history = newestFirst(measurements);
  const ratioBasis = props.perspective === 'coach' ? props : null;
  const columns = ratioBasis ? [...VALUE_COLUMNS, 'Ratio'] : VALUE_COLUMNS;
  const viewPhotos = history.some(hasProgressPhotos) ? onViewPhotos : undefined;

  return (
    <PortalWidget
      presentation={props.perspective}
      title="Measurements"
      action={history.length > 0 ? action : undefined}
      icon={
        <Ruler aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      headingId={headingId}
      parityRoot="MeasurementsTable"
      className={className}
    >
      {intro}

      {history.length === 0 ? (
        <>
          <p
            className="text-sm text-text-secondary"
            data-parity="measurements-empty"
          >
            {emptyMessage}
          </p>
          {emptyAction && <div className="mt-4">{emptyAction}</div>}
        </>
      ) : (
        <div className="-mx-6 overflow-x-auto">
          <Table>
            <caption className="sr-only">
              Measurements history, newest first
            </caption>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                {viewPhotos && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => {
                const recordedOn = formatJourneyDate(entry.recordedAt);

                return (
                  <TableRow key={entry.id}>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {recordedOn}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {formatBodyWeight(entry.weightKg, units.weight)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {circumference(entry.waistCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {circumference(entry.hipsCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {circumference(entry.thighCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {circumference(entry.armCm, units)}
                    </TableCell>
                    {ratioBasis && (
                      <TableCell className={VALUE_CELL_CLASS}>
                        {coachRatio(entry, ratioBasis)}
                      </TableCell>
                    )}
                    {viewPhotos && (
                      <TableCell
                        className="text-right"
                        data-parity="row-actions"
                      >
                        {hasProgressPhotos(entry) && (
                          <Button
                            aria-label={`View photos from ${recordedOn}`}
                            onClick={() => viewPhotos(entry)}
                            size="sm"
                            type="button"
                            variant="ghost"
                          >
                            View photos
                          </Button>
                        )}
                      </TableCell>
                    )}
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
