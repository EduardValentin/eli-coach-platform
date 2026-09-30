import {
  measureUnitLabel,
  toDisplayMeasure,
  type MeasureKind,
  type MeasureUnits,
} from "@eli-coach-platform/domain/unit-preference";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eli-coach-platform/ui/primitives";
import { Ruler } from "lucide-react";
import type { ReactNode } from "react";

import {
  MEASUREMENTS_COPY,
  type MeasurementRow,
} from "~/features/client-profile/contracts/measurements";
import { waistToHeightRatio } from "~/features/client-profile/ui/shared/body-metrics";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/features/coaching-sales/ui/shared/calendar-day-format";

type CoachRatioBasis = { heightCm: number | null; ratioHidden: boolean };

type MeasurementsPerspective =
  | { perspective: "client"; units: MeasureUnits }
  | ({ perspective: "coach" } & CoachRatioBasis);

type MeasurementsTableProps = MeasurementsPerspective & {
  measurements: MeasurementRow[];
  headingId: string;
  emptyMessage: string;
  action?: ReactNode;
  emptyAction?: ReactNode;
  className?: string;
  children?: ReactNode;
  onViewPhotos?: (row: MeasurementRow) => void;
};

const COACH_UNITS: MeasureUnits = { weight: "kg", length: "cm" };

const RATIO_COLUMN = "Ratio";

const VALUE_COLUMNS = MEASUREMENTS_COPY.columns.filter(
  (column) => column !== RATIO_COLUMN,
);

const ACTIONS_COLUMN = "Actions";

const VALUE_CELL_CLASS = "text-sm text-text-primary";

function newestFirst(measurements: MeasurementRow[]): MeasurementRow[] {
  return [...measurements].sort(
    (first, second) =>
      Date.parse(second.recordedAt) - Date.parse(first.recordedAt),
  );
}

function hasPhotos(row: MeasurementRow): boolean {
  return row.photos.length > 0;
}

function reading(
  kind: MeasureKind,
  canonical: number | null,
  units: MeasureUnits,
): string {
  return canonical === null
    ? MEASUREMENTS_COPY.missing
    : `${toDisplayMeasure(kind, canonical, units)} ${measureUnitLabel(kind, units)}`;
}

function coachRatio(row: MeasurementRow, basis: CoachRatioBasis): string {
  if (basis.ratioHidden) return MEASUREMENTS_COPY.missing;

  return (
    waistToHeightRatio(row.waistCm, basis.heightCm) ?? MEASUREMENTS_COPY.missing
  );
}

function ViewPhotosCell({
  onViewPhotos,
  recordedOn,
  row,
}: {
  onViewPhotos: (row: MeasurementRow) => void;
  recordedOn: string;
  row: MeasurementRow;
}) {
  return (
    <TableCell className="text-right" data-parity="row-actions">
      {hasPhotos(row) && (
        <Button
          aria-label={MEASUREMENTS_COPY.photoView.openFrom(recordedOn)}
          onClick={() => onViewPhotos(row)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {MEASUREMENTS_COPY.photoView.open}
        </Button>
      )}
    </TableCell>
  );
}

export function MeasurementsTable(props: MeasurementsTableProps) {
  const {
    measurements,
    headingId,
    emptyMessage,
    action,
    emptyAction,
    className,
    children,
    onViewPhotos,
  } = props;
  const timeZone = useCalendarDayTimeZone();
  const history = newestFirst(measurements);
  const units = props.perspective === "client" ? props.units : COACH_UNITS;
  const ratioBasis = props.perspective === "coach" ? props : null;
  const columns = ratioBasis ? MEASUREMENTS_COPY.columns : VALUE_COLUMNS;
  const viewPhotos = history.some(hasPhotos) ? onViewPhotos : undefined;

  return (
    <PortalWidget
      action={history.length > 0 ? action : undefined}
      className={className}
      data-parity-root="MeasurementsTable"
      headingId={headingId}
      icon={
        <Ruler aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      title={MEASUREMENTS_COPY.title}
    >
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
            <caption className="sr-only">{MEASUREMENTS_COPY.caption}</caption>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
                {viewPhotos && (
                  <TableHead>
                    <span className="sr-only">{ACTIONS_COLUMN}</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => {
                const recordedOn = formatDayMonth(row.recordedAt, timeZone);

                return (
                  <TableRow key={row.id}>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {recordedOn}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {reading("weight", row.weightKg, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {reading("circumference", row.waistCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {reading("circumference", row.hipsCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {reading("circumference", row.thighCm, units)}
                    </TableCell>
                    <TableCell className={VALUE_CELL_CLASS}>
                      {reading("circumference", row.armCm, units)}
                    </TableCell>
                    {ratioBasis && (
                      <TableCell className={VALUE_CELL_CLASS}>
                        {coachRatio(row, ratioBasis)}
                      </TableCell>
                    )}
                    {viewPhotos && (
                      <ViewPhotosCell
                        onViewPhotos={viewPhotos}
                        recordedOn={recordedOn}
                        row={row}
                      />
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
