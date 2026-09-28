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

import type { MeasurementRow } from "~/features/client-onboarding/contracts/onboarding-review";
import { MEASUREMENTS_COPY } from "~/features/client-onboarding/contracts/onboarding-review-copy";

import { roundToTenth, waistToHeightRatio } from "./body-metrics";
import { formatDayMonth, useReviewDayTimeZone } from "./review-day-format";

type MeasurementsTableProps = {
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

function circumference(valueCm: number | null): string {
  return valueCm === null
    ? MEASUREMENTS_COPY.missing
    : `${roundToTenth(valueCm)} cm`;
}

export function MeasurementsTable({
  heightCm,
  measurements,
}: MeasurementsTableProps) {
  const timeZone = useReviewDayTimeZone();
  const history = newestFirst(measurements);

  return (
    <div className="mb-8" data-parity-root="MeasurementsTable">
      <PortalWidget
        headingId="measurements-panel-heading"
        icon={
          <Ruler
            aria-hidden="true"
            className="text-brand-secondary"
            size={18}
          />
        }
        title={MEASUREMENTS_COPY.title}
      >
        {history.length === 0 ? (
          <p
            className="text-sm text-text-secondary"
            data-parity="measurements-empty"
          >
            {MEASUREMENTS_COPY.empty}
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
                      {circumference(entry.waistCm)}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      {circumference(entry.hipsCm)}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      {circumference(entry.thighCm)}
                    </TableCell>
                    <TableCell className={CELL_CLASS}>
                      {circumference(entry.armCm)}
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
    </div>
  );
}
