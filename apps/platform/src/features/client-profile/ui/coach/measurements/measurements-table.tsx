import type { VisitorGender } from "@eli-coach-platform/domain/assessment-call";
import { PortalWidget } from "@eli-coach-platform/ui/portal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@eli-coach-platform/ui/primitives";
import { Ruler } from "lucide-react";

import {
  MEASUREMENTS_COPY,
  type MeasurementRow,
} from "~/features/client-profile/contracts/measurements";
import {
  roundToTenth,
  waistToHeightRatio,
} from "~/features/client-profile/ui/shared/body-metrics";
import {
  formatDayMonth,
  useCalendarDayTimeZone,
} from "~/features/coaching-sales/ui/shared/calendar-day-format";

type MeasurementsTableProps = {
  gender: VisitorGender;
  heightCm: number | null;
  measurements: MeasurementRow[];
};

const CELL_CLASS = "text-sm text-text-primary";

function newestFirst(measurements: MeasurementRow[]): MeasurementRow[] {
  return [...measurements].sort(
    (first, second) =>
      Date.parse(second.recordedAt) - Date.parse(first.recordedAt),
  );
}

function circumferenceCell(valueCm: number | null): string {
  return valueCm === null
    ? MEASUREMENTS_COPY.missing
    : `${roundToTenth(valueCm)} cm`;
}

export function MeasurementsTable({
  gender,
  heightCm,
  measurements,
}: MeasurementsTableProps) {
  const timeZone = useCalendarDayTimeZone();
  const history = newestFirst(measurements);

  return (
    <PortalWidget
      className="mb-8"
      data-parity-root="MeasurementsTable"
      headingId="measurements-panel-heading"
      icon={
        <Ruler aria-hidden="true" className="text-brand-secondary" size={18} />
      }
      title={MEASUREMENTS_COPY.title}
    >
      {history.length === 0 ? (
        <p
          className="text-sm text-text-secondary"
          data-parity="measurements-empty"
        >
          {MEASUREMENTS_COPY.empty(gender)}
        </p>
      ) : (
        <div className="-mx-6 overflow-x-auto">
          <Table>
            <caption className="sr-only">{MEASUREMENTS_COPY.caption}</caption>
            <TableHeader>
              <TableRow>
                {MEASUREMENTS_COPY.columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.recordedAt}>
                  <TableCell className={CELL_CLASS}>
                    {formatDayMonth(entry.recordedAt, timeZone)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {`${roundToTenth(entry.weightKg)} kg`}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {circumferenceCell(entry.waistCm)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {circumferenceCell(entry.hipsCm)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {circumferenceCell(entry.thighCm)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {circumferenceCell(entry.armCm)}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {waistToHeightRatio(entry.waistCm, heightCm) ??
                      MEASUREMENTS_COPY.missing}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PortalWidget>
  );
}
